import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/app/lib/support-calls/auth';
import { hashToken } from '@/app/lib/support-calls/tokens';
import { writeSupportCallAudit } from '@/app/lib/support-calls/audit';
import { notifySupportCallUsers } from '@/app/lib/support-calls/notify';
import { buildJobCardPdf } from '@/app/lib/support-calls/pdf';
import { loadPdfSourceData } from '@/app/lib/support-calls/pdf-data';
import { formatLabourDisplay } from '@/app/lib/support-calls/labour';
import {
  DOCUMENTS_BUCKET,
  cleanStr,
  handleRouteError,
  jsonError,
  readJson,
  recomputeWorkflowStage,
} from '@/app/lib/support-calls/server';

export const runtime = 'nodejs';

type TokenRow = {
  id: string;
  support_call_id: string;
  job_card_id: string;
  expires_at: string;
  revoked_at: string | null;
  used_at: string | null;
};

/** Public lookup. Unknown tokens are a uniform 404; spent/expired ones a 410. */
async function resolveToken(supabase: ReturnType<typeof getServiceRoleClient>, raw: string) {
  if (!raw || raw.length < 20 || raw.length > 200) return { error: jsonError('Link not found', 404) };
  const { data } = await supabase
    .from('support_call_signing_tokens')
    .select('id, support_call_id, job_card_id, expires_at, revoked_at, used_at')
    .eq('token_hash', hashToken(raw))
    .maybeSingle();
  const row = data as TokenRow | null;
  if (!row) return { error: jsonError('Link not found', 404) };
  if (row.used_at) return { error: jsonError('This job card has already been signed', 410, { code: 'USED' }) };
  if (row.revoked_at) return { error: jsonError('This signing link is no longer valid', 410, { code: 'REVOKED' }) };
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return { error: jsonError('This signing link has expired', 410, { code: 'EXPIRED' }) };
  }
  return { row };
}

/** GET /api/sign/[token] — public; returns the customer-safe job card content. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const supabase = getServiceRoleClient();
    const resolved = await resolveToken(supabase, token);
    if ('error' in resolved && resolved.error) return resolved.error;
    const row = resolved.row!;

    const [{ data: card }, { data: sc }] = await Promise.all([
      supabase.from('support_call_job_cards').select('id, version, status, pdf_storage_path').eq('id', row.job_card_id).maybeSingle(),
      supabase
        .from('support_calls')
        .select(
          'id, support_call_number, client, site_name, estate_or_building, location, original_description, reported_at, responsible_name, responsible_position, responsible_organisation, overall_status'
        )
        .eq('id', row.support_call_id)
        .maybeSingle(),
    ]);
    if (!card || !sc || card.status !== 'awaiting_signature' || sc.overall_status !== 'open') {
      return jsonError('This signing link is no longer valid', 410, { code: 'REVOKED' });
    }

    const src = await loadPdfSourceData(supabase, row.support_call_id);
    const visits = src.visits.map((v) => ({
      visit_number: v.visit_number,
      party_type: v.party_type,
      visit_date: v.visit_date,
      arrived_at: v.arrived_at,
      departed_at: v.departed_at,
      labour: v.labour_minutes != null ? formatLabourDisplay(Number(v.labour_minutes)) : null,
      diagnosis: v.diagnosis,
      work_performed: v.work_performed,
      test_results: v.test_results,
      incomplete: v.incomplete,
      technician: v.assignment_id ? src.memberNames[String(v.assignment_id)] ?? null : null,
    }));
    const hardware = src.hardware.map((h) => ({
      description: h.description,
      make_model: h.make_model,
      quantity: h.quantity,
      old_equipment: h.old_equipment,
      new_equipment: h.new_equipment,
      serial_number: h.serial_number,
    }));

    let pdf_url: string | null = null;
    if (card.pdf_storage_path) {
      const { data: signed } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(card.pdf_storage_path, 60 * 15);
      pdf_url = signed?.signedUrl ?? null;
    }

    const { overall_status: _status, id: _id, ...scPublic } = sc;
    void _status;
    void _id;
    return NextResponse.json({
      job_card: { version: card.version },
      support_call: scPublic,
      visits,
      hardware,
      pdf_url,
      expires_at: row.expires_at,
    });
  } catch (e) {
    return handleRouteError('GET /sign/[token]', e);
  }
}

const MAX_SIGNATURE_CHARS = 700_000;

/** POST /api/sign/[token] — public; { signer_name, signer_position?, signer_company?, signature_data, confirmed } */
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const supabase = getServiceRoleClient();
    const resolved = await resolveToken(supabase, token);
    if ('error' in resolved && resolved.error) return resolved.error;
    const row = resolved.row!;

    const body = await readJson(request);
    const signer_name = cleanStr(body.signer_name, 200);
    if (!signer_name) return jsonError('Please enter your full name', 400);
    if (body.confirmed !== true) return jsonError('Please confirm that you accept the work', 400);
    const signature_data = typeof body.signature_data === 'string' ? body.signature_data : '';
    if (!signature_data.startsWith('data:image/png;base64,')) {
      return jsonError('A drawn signature is required', 400);
    }
    if (signature_data.length > MAX_SIGNATURE_CHARS) return jsonError('Signature image is too large', 413);
    if (signature_data.length < 400) return jsonError('Please draw your signature', 400);

    const { data: card } = await supabase
      .from('support_call_job_cards')
      .select('*')
      .eq('id', row.job_card_id)
      .maybeSingle();
    const { data: sc } = await supabase.from('support_calls').select('*').eq('id', row.support_call_id).maybeSingle();
    if (!card || !sc || card.status !== 'awaiting_signature' || sc.overall_status !== 'open') {
      return jsonError('This signing link is no longer valid', 410, { code: 'REVOKED' });
    }

    // Atomically consume the token — only one concurrent request can win.
    const nowIso = new Date().toISOString();
    const { data: consumed } = await supabase
      .from('support_call_signing_tokens')
      .update({ used_at: nowIso })
      .eq('id', row.id)
      .is('used_at', null)
      .is('revoked_at', null)
      .gt('expires_at', nowIso)
      .select('id')
      .maybeSingle();
    if (!consumed) return jsonError('This job card has already been signed or the link is no longer valid', 410);

    const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim().slice(0, 64) || null;
    const signature = {
      support_call_id: row.support_call_id,
      job_card_id: row.job_card_id,
      signer_name,
      signer_position: cleanStr(body.signer_position, 200),
      signer_company: cleanStr(body.signer_company, 200),
      signature_data,
      confirmed: true,
      signed_at: nowIso,
      ip_hint: ip,
    };
    const { error: sigErr } = await supabase.from('support_call_signatures').insert(signature);
    if (sigErr) {
      // Give the link back so the customer can retry.
      await supabase.from('support_call_signing_tokens').update({ used_at: null }).eq('id', row.id);
      return jsonError('Could not save signature, please try again', 500);
    }

    await supabase
      .from('support_call_job_cards')
      .update({ status: 'signed' })
      .eq('id', row.job_card_id);

    // Signed copy of the PDF (best effort)
    let signedPath: string | null = null;
    try {
      const src = await loadPdfSourceData(supabase, row.support_call_id);
      const buffer = await buildJobCardPdf({
        sc: sc as Record<string, unknown>,
        version: card.version,
        visits: src.visits,
        hardware: src.hardware,
        memberNames: src.memberNames,
        signature: {
          signer_name,
          signer_position: signature.signer_position,
          signer_company: signature.signer_company,
          signed_at: nowIso,
          signature_data,
        },
      });
      signedPath = `${row.support_call_id}/job-cards/${sc.support_call_number}-v${card.version}-signed.pdf`;
      const { error: upErr } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .upload(signedPath, buffer, { contentType: 'application/pdf', upsert: true });
      if (upErr) throw new Error(upErr.message);
      await supabase.from('support_call_job_cards').update({ signed_pdf_storage_path: signedPath }).eq('id', row.job_card_id);
    } catch (pdfErr) {
      signedPath = null;
      console.error('[support-calls] signed pdf failed', pdfErr instanceof Error ? pdfErr.message : pdfErr);
    }

    await writeSupportCallAudit(supabase, {
      support_call_id: row.support_call_id,
      ticket_id: sc.ticket_id,
      related_id: row.job_card_id,
      actor_id: null,
      actor_role: 'customer',
      event_type: 'job_card_signed',
      new_value: { signer_name, signer_company: signature.signer_company, signed_pdf: Boolean(signedPath) },
      source: 'public_signing',
    });

    await notifySupportCallUsers(supabase, {
      userIds: [sc.hto_owner_id],
      type: 'support_call_attention',
      title: `Job card signed on ${sc.support_call_number}`,
      message: `${signer_name} signed the job card. Finance handover can now be prepared.`,
      ticket_id: sc.ticket_id,
      triggering_user_id: sc.hto_owner_id,
      triggering_user_role: 'admin',
    });

    await recomputeWorkflowStage(supabase, row.support_call_id);
    return NextResponse.json({ success: true, signed_at: nowIso });
  } catch (e) {
    return handleRouteError('POST /sign/[token]', e);
  }
}
