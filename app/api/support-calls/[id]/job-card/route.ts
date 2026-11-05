import { NextRequest, NextResponse } from 'next/server';
import {
  DOCUMENTS_BUCKET,
  dbError,
  handleRouteError,
  jsonError,
  loadFlagRows,
  computeWorkflowFlags,
  recomputeWorkflowStage,
  scContext,
  type RouteCtx,
} from '@/app/lib/support-calls/server';
import { buildJobCardPdf } from '@/app/lib/support-calls/pdf';
import { loadPdfSourceData } from '@/app/lib/support-calls/pdf-data';

export const runtime = 'nodejs';

/** GET /api/support-calls/[id]/job-card — versions + short-lived signed PDF URLs (managers). */
export async function GET(request: NextRequest, { params }: RouteCtx) {
  try {
    const { id } = await params;
    const ctx = await scContext(request, id, 'manager');
    if (!ctx.ok) return ctx.response;
    const { data, error } = await ctx.auth.supabase
      .from('support_call_job_cards')
      .select('*')
      .eq('support_call_id', ctx.sc.id)
      .order('version', { ascending: false });
    if (error) return dbError('job-card.list', error);
    const job_cards = await Promise.all(
      (data || []).map(async (j: { pdf_storage_path: string | null; signed_pdf_storage_path: string | null }) => {
        const path = j.signed_pdf_storage_path || j.pdf_storage_path;
        let url: string | null = null;
        if (path) {
          const { data: signed } = await ctx.auth.supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(path, 60 * 30);
          url = signed?.signedUrl ?? null;
        }
        return { ...j, url };
      })
    );
    return NextResponse.json({ job_cards });
  } catch (e) {
    return handleRouteError('GET /support-calls/[id]/job-card', e);
  }
}

/**
 * POST /api/support-calls/[id]/job-card — managers only. Generates the next job-card version.
 * Gate: at least one assignee + visit, and every assignee's latest contribution approved.
 * Earlier versions are superseded and their signing links revoked. A PDF is generated with jsPDF
 * and stored in the support-call-documents bucket; if PDF generation fails the metadata row is
 * still created (pdf_generated:false) so the flow is never blocked.
 */
export async function POST(request: NextRequest, { params }: RouteCtx) {
  try {
    const { id } = await params;
    const ctx = await scContext(request, id, 'manager', { requireOpen: true });
    if (!ctx.ok) return ctx.response;
    const { auth, sc } = ctx;
    const supabase = auth.supabase;

    const rows = await loadFlagRows(supabase, sc.id);
    const flags = computeWorkflowFlags(rows);
    const blockers: string[] = [];
    if (!flags.hasAssignments) blockers.push('No team member is assigned');
    if (!flags.hasVisits) blockers.push('No visit has been logged');
    if (flags.hasOpenDependency) blockers.push('The latest visit is marked incomplete (open dependency)');
    if (flags.hasPendingQuote) blockers.push('A quote decision is pending');
    if (flags.contributionsOutstanding) blockers.push('Not every assignee (and partner, if any) has completed their work');
    if (blockers.length) {
      return jsonError('Job card cannot be generated yet', 409, { code: 'GATE_BLOCKED', blockers });
    }

    const { data: existing } = await supabase
      .from('support_call_job_cards')
      .select('id, version, status')
      .eq('support_call_id', sc.id);
    const version = Math.max(0, ...(existing || []).map((j: { version: number }) => j.version)) + 1;
    const now = new Date().toISOString();

    const { data: card, error } = await supabase
      .from('support_call_job_cards')
      .insert({
        support_call_id: sc.id,
        version,
        status: 'ready',
        generated_by: auth.userId,
        generated_at: now,
        locked_at: now,
      })
      .select('*')
      .single();
    if (error) return dbError('job-card.create', error);

    // Supersede earlier versions and revoke their signing links.
    const previousIds = (existing || []).filter((j: { status: string }) => j.status !== 'superseded').map((j: { id: string }) => j.id);
    if (previousIds.length) {
      await supabase.from('support_call_job_cards').update({ status: 'superseded' }).in('id', previousIds);
      await supabase
        .from('support_call_signing_tokens')
        .update({ revoked_at: now })
        .in('job_card_id', previousIds)
        .is('revoked_at', null)
        .is('used_at', null);
    }

    // PDF (best effort)
    let pdfGenerated = false;
    let pdfError: string | null = null;
    let pdfPath: string | null = null;
    try {
      const src = await loadPdfSourceData(supabase, sc.id);
      const buffer = await buildJobCardPdf({
        sc: sc as unknown as Record<string, unknown>,
        version,
        visits: src.visits,
        hardware: src.hardware,
        memberNames: src.memberNames,
      });
      pdfPath = `${sc.id}/job-cards/${sc.support_call_number}-v${version}.pdf`;
      const { error: upErr } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .upload(pdfPath, buffer, { contentType: 'application/pdf', upsert: true });
      if (upErr) throw new Error(upErr.message);
      await supabase.from('support_call_job_cards').update({ pdf_storage_path: pdfPath }).eq('id', card.id);
      card.pdf_storage_path = pdfPath;
      pdfGenerated = true;
    } catch (pdfErr) {
      pdfError = pdfErr instanceof Error ? pdfErr.message : 'PDF generation failed';
      console.error('[support-calls] job card pdf failed', pdfError);
    }

    await ctx.audit('job_card_generated', {
      related_id: card.id,
      previous_value: previousIds.length ? { superseded_job_cards: previousIds } : null,
      new_value: { version, pdf_generated: pdfGenerated, pdf_storage_path: pdfPath },
    });

    const stage = await recomputeWorkflowStage(supabase, sc.id);
    return NextResponse.json(
      { job_card: card, pdf_generated: pdfGenerated, pdf_error: pdfGenerated ? null : pdfError, workflow: stage },
      { status: 201 }
    );
  } catch (e) {
    return handleRouteError('POST /support-calls/[id]/job-card', e);
  }
}
