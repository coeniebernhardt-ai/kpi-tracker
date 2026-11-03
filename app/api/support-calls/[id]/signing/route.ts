import { NextRequest, NextResponse } from 'next/server';
import {
  cleanIso,
  cleanStr,
  dbError,
  handleRouteError,
  jsonError,
  readJson,
  recomputeWorkflowStage,
  scContext,
  siteOrigin,
  type RouteCtx,
} from '@/app/lib/support-calls/server';
import { createSigningToken } from '@/app/lib/support-calls/tokens';
import { SIGNING_TOKEN_TTL_DAYS } from '@/app/lib/support-calls/constants';

const REASONS = ['Unavailable', 'Refused', 'Disputed work', 'Other'] as const;

async function currentJobCard(
  supabase: import('@supabase/supabase-js').SupabaseClient,
  scId: string
) {
  const { data } = await supabase
    .from('support_call_job_cards')
    .select('*')
    .eq('support_call_id', scId)
    .neq('status', 'superseded')
    .order('version', { ascending: false })
    .limit(1);
  return (data?.[0] as { id: string; version: number; status: string } | undefined) ?? null;
}

/**
 * POST /api/support-calls/[id]/signing — managers only.
 *  { action: 'generate' | 'regenerate' }  create a signing link (only the sha256 hash is stored)
 *  { action: 'exception', reason, explanation, interaction_at?, method? }  Signature Not Obtained
 * The raw token / URL is returned ONCE and cannot be retrieved later (use regenerate).
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

    const card = await currentJobCard(supabase, sc.id);
    if (!card) return jsonError('Generate a job card first', 409);
    if (card.status === 'signed') return jsonError('This job card is already signed', 409);

    if (action === 'exception') {
      const reason = body.reason as (typeof REASONS)[number];
      if (!REASONS.includes(reason)) return jsonError(`reason must be one of ${REASONS.join(', ')}`, 400);
      const explanation = cleanStr(body.explanation, 5000);
      if (!explanation) return jsonError('An explanation is required for Signature Not Obtained', 400);

      const { data: exception, error } = await supabase
        .from('support_call_signature_exceptions')
        .insert({
          support_call_id: sc.id,
          job_card_id: card.id,
          reason,
          interaction_at: cleanIso(body.interaction_at) ?? new Date().toISOString(),
          method: cleanStr(body.method, 100),
          explanation,
          actor_id: auth.userId,
        })
        .select('*')
        .single();
      if (error) return dbError('signing.exception', error);

      // The link must no longer be usable once the exception is recorded.
      await supabase
        .from('support_call_signing_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('job_card_id', card.id)
        .is('revoked_at', null)
        .is('used_at', null);

      await ctx.audit('signature_not_obtained', {
        related_id: exception.id,
        new_value: { job_card_id: card.id, reason, method: exception.method },
        reason: explanation,
      });
      const stage = await recomputeWorkflowStage(supabase, sc.id);
      return NextResponse.json({ signature_exception: exception, workflow: stage }, { status: 201 });
    }

    if (action !== 'generate' && action !== 'regenerate') {
      return jsonError("action must be 'generate', 'regenerate' or 'exception'", 400);
    }

    const nowIso = new Date().toISOString();
    const { data: active } = await supabase
      .from('support_call_signing_tokens')
      .select('id')
      .eq('job_card_id', card.id)
      .is('revoked_at', null)
      .is('used_at', null)
      .gt('expires_at', nowIso);

    if (action === 'generate' && active?.length) {
      return jsonError('An active signing link already exists. Use regenerate to replace it.', 409, {
        code: 'ACTIVE_LINK_EXISTS',
      });
    }

    // Revoke everything still live for this job card, then issue a fresh token.
    await supabase
      .from('support_call_signing_tokens')
      .update({ revoked_at: nowIso })
      .eq('job_card_id', card.id)
      .is('revoked_at', null)
      .is('used_at', null);

    const { raw, hash } = createSigningToken();
    const expires_at = new Date(Date.now() + SIGNING_TOKEN_TTL_DAYS * 86400000).toISOString();
    const { data: tokenRow, error } = await supabase
      .from('support_call_signing_tokens')
      .insert({
        support_call_id: sc.id,
        job_card_id: card.id,
        token_hash: hash,
        expires_at,
        created_by: auth.userId,
      })
      .select('id, expires_at, created_at')
      .single();
    if (error) return dbError('signing.token', error);

    await supabase
      .from('support_call_job_cards')
      .update({ status: 'awaiting_signature' })
      .eq('id', card.id)
      .in('status', ['ready', 'awaiting_signature']);

    await ctx.audit(action === 'regenerate' ? 'signing_link_regenerated' : 'signing_link_generated', {
      related_id: tokenRow.id,
      previous_value: active?.length ? { revoked_token_ids: active.map((a: { id: string }) => a.id) } : null,
      new_value: { job_card_id: card.id, expires_at },
    });
    const stage = await recomputeWorkflowStage(supabase, sc.id);

    return NextResponse.json(
      {
        token: raw,
        url: `${siteOrigin(request)}/sign/${raw}`,
        expires_at,
        job_card_id: card.id,
        workflow: stage,
      },
      { status: 201 }
    );
  } catch (e) {
    return handleRouteError('POST /support-calls/[id]/signing', e);
  }
}
