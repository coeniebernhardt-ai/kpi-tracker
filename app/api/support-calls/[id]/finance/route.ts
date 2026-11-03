import { NextRequest, NextResponse } from 'next/server';
import {
  DOCUMENTS_BUCKET,
  cleanIso,
  cleanStr,
  dbError,
  handleRouteError,
  isUuid,
  jsonError,
  readJson,
  recomputeWorkflowStage,
  scContext,
  type RouteCtx,
} from '@/app/lib/support-calls/server';
import { buildFinanceReportPdf } from '@/app/lib/support-calls/pdf';
import { loadPdfSourceData } from '@/app/lib/support-calls/pdf-data';

export const runtime = 'nodejs';

/** GET /api/support-calls/[id]/finance — managers. Handover versions with signed report URLs. */
export async function GET(request: NextRequest, { params }: RouteCtx) {
  try {
    const { id } = await params;
    const ctx = await scContext(request, id, 'manager');
    if (!ctx.ok) return ctx.response;
    const { data, error } = await ctx.auth.supabase
      .from('support_call_finance_handovers')
      .select('*')
      .eq('support_call_id', ctx.sc.id)
      .order('version', { ascending: false });
    if (error) return dbError('finance.list', error);
    const handovers = await Promise.all(
      (data || []).map(async (h: { report_storage_path: string | null }) => {
        let url: string | null = null;
        if (h.report_storage_path) {
          const { data: signed } = await ctx.auth.supabase.storage
            .from(DOCUMENTS_BUCKET)
            .createSignedUrl(h.report_storage_path, 60 * 30);
          url = signed?.signedUrl ?? null;
        }
        return { ...h, url };
      })
    );
    return NextResponse.json({ handovers });
  } catch (e) {
    return handleRouteError('GET /support-calls/[id]/finance', e);
  }
}

/**
 * POST /api/support-calls/[id]/finance — managers only.
 *  { action: 'generate' }                       build the next handover report version
 *  { action: 'download-ack', handover_id? }     acknowledge download (returns signed URL); required before 'sent'
 *  { action: 'sent', handover_id?, confirm: true, finance_recipient, communication_method, email_subject?, notes? }
 */
export async function POST(request: NextRequest, { params }: RouteCtx) {
  try {
    const { id } = await params;
    const ctx = await scContext(request, id, 'manager', { requireOpen: true });
    if (!ctx.ok) return ctx.response;
    const { auth, sc } = ctx;
    const supabase = auth.supabase;
    const body = await readJson(request);
    const action = body.action;

    const { data: allHandovers } = await supabase
      .from('support_call_finance_handovers')
      .select('*')
      .eq('support_call_id', sc.id)
      .order('version', { ascending: false });
    const handovers = (allHandovers || []) as Array<Record<string, unknown> & { id: string; version: number }>;

    if (action === 'generate') {
      const { data: cards } = await supabase
        .from('support_call_job_cards')
        .select('*')
        .eq('support_call_id', sc.id)
        .neq('status', 'superseded')
        .order('version', { ascending: false })
        .limit(1);
      const card = cards?.[0] as { id: string; version: number; status: string } | undefined;
      if (!card) return jsonError('Generate a job card first', 409);

      const [{ data: signature }, { data: exception }] = await Promise.all([
        supabase
          .from('support_call_signatures')
          .select('signer_name, signed_at')
          .eq('job_card_id', card.id)
          .order('signed_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('support_call_signature_exceptions')
          .select('*')
          .eq('job_card_id', card.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (card.status !== 'signed' && !exception) {
        return jsonError('The job card must be signed (or a Signature Not Obtained exception recorded)', 409, {
          code: 'GATE_BLOCKED',
        });
      }

      const version = (handovers[0]?.version ?? 0) + 1;
      const now = new Date().toISOString();
      const src = await loadPdfSourceData(supabase, sc.id);

      let report_storage_path: string | null = null;
      let pdfError: string | null = null;
      try {
        const buffer = await buildFinanceReportPdf({
          sc: sc as unknown as Record<string, unknown>,
          version,
          visits: src.visits,
          hardware: src.hardware,
          quotes: src.quotes,
          memberNames: src.memberNames,
          jobCardVersion: card.version,
          signedBy: signature?.signer_name ?? null,
          signatureException: exception ?? null,
        });
        const path = `${sc.id}/finance/${sc.support_call_number}-finance-v${version}.pdf`;
        const { error: upErr } = await supabase.storage
          .from(DOCUMENTS_BUCKET)
          .upload(path, buffer, { contentType: 'application/pdf', upsert: true });
        if (upErr) throw new Error(upErr.message);
        report_storage_path = path;
      } catch (e) {
        pdfError = e instanceof Error ? e.message : 'PDF generation failed';
        console.error('[support-calls] finance pdf failed', pdfError);
      }
      if (!report_storage_path) {
        return jsonError('Could not generate the finance report', 500, { detail: pdfError });
      }

      const { data: handover, error } = await supabase
        .from('support_call_finance_handovers')
        .insert({
          support_call_id: sc.id,
          version,
          report_storage_path,
          generated_by: auth.userId,
          generated_at: now,
        })
        .select('*')
        .single();
      if (error) return dbError('finance.create', error);

      await ctx.audit('finance_report_generated', {
        related_id: handover.id,
        new_value: { version, report_storage_path },
      });
      const { data: signed } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(report_storage_path, 60 * 30);
      const stage = await recomputeWorkflowStage(supabase, sc.id);
      return NextResponse.json({ handover: { ...handover, url: signed?.signedUrl ?? null }, workflow: stage }, { status: 201 });
    }

    const target = isUuid(body.handover_id)
      ? handovers.find((h) => h.id === body.handover_id)
      : handovers[0];
    if (!target) return jsonError('No finance report has been generated yet', 409);

    if (action === 'download-ack') {
      const patch: Record<string, unknown> = {};
      if (!target.downloaded_at) {
        patch.downloaded_at = new Date().toISOString();
        patch.downloaded_by = auth.userId;
        const { error } = await supabase.from('support_call_finance_handovers').update(patch).eq('id', target.id);
        if (error) return dbError('finance.download', error);
        await ctx.audit('finance_report_downloaded', { related_id: target.id, new_value: patch });
      }
      let url: string | null = null;
      if (target.report_storage_path) {
        const { data: signed } = await supabase.storage
          .from(DOCUMENTS_BUCKET)
          .createSignedUrl(target.report_storage_path as string, 60 * 30);
        url = signed?.signedUrl ?? null;
      }
      return NextResponse.json({ handover: { ...target, ...patch }, url });
    }

    if (action === 'sent') {
      if (body.confirm !== true) return jsonError('Confirm that the report was actually sent to finance', 400);
      if (!target.downloaded_at) {
        return jsonError('Download the finance report before confirming it was sent', 409, { code: 'NOT_DOWNLOADED' });
      }
      if (target.sent_confirmed) return jsonError('This handover is already marked as sent', 409);
      const finance_recipient = cleanStr(body.finance_recipient, 200);
      const communication_method = cleanStr(body.communication_method, 100);
      if (!finance_recipient) return jsonError('finance_recipient is required', 400);
      if (!communication_method) return jsonError('communication_method is required', 400);

      const { data: updated, error } = await supabase
        .from('support_call_finance_handovers')
        .update({
          sent_confirmed: true,
          sent_at: cleanIso(body.sent_at) ?? new Date().toISOString(),
          sent_by: auth.userId,
          finance_recipient,
          communication_method,
          email_subject: cleanStr(body.email_subject, 300),
          notes: cleanStr(body.notes, 3000),
        })
        .eq('id', target.id)
        .eq('sent_confirmed', false)
        .select('*')
        .maybeSingle();
      if (error) return dbError('finance.sent', error);
      if (!updated) return jsonError('This handover is already marked as sent', 409);

      await ctx.audit('finance_sent_confirmed', {
        related_id: updated.id,
        new_value: { finance_recipient, communication_method, version: updated.version },
      });
      const stage = await recomputeWorkflowStage(supabase, sc.id);
      return NextResponse.json({ handover: updated, workflow: stage });
    }

    return jsonError("action must be 'generate', 'download-ack' or 'sent'", 400);
  } catch (e) {
    return handleRouteError('POST /support-calls/[id]/finance', e);
  }
}
