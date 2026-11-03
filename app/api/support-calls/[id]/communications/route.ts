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
  type RouteCtx,
} from '@/app/lib/support-calls/server';

const KINDS = ['initial_notification', 'eta_notification', 'partner_contact', 'other'] as const;
const OUTCOMES = ['complete', 'attempted'] as const;
const METHODS = ['Email', 'Telephone', 'WhatsApp', 'Other'] as const;

/**
 * POST /api/support-calls/[id]/communications
 * Records a notification checkpoint (initial / ETA / partner / other) and updates
 * support_calls.initial_notification_status / eta_notification_status.
 * "complete" requires confirmation; "attempted" requires a failure reason.
 */
export async function POST(request: NextRequest, { params }: RouteCtx) {
  try {
    const { id } = await params;
    const ctx = await scContext(request, id, 'manager', { requireOpen: true });
    if (!ctx.ok) return ctx.response;
    const { auth, sc } = ctx;
    const body = await readJson(request);

    const kind = body.kind as (typeof KINDS)[number];
    const outcome = body.outcome as (typeof OUTCOMES)[number];
    const method = body.method as (typeof METHODS)[number];
    if (!KINDS.includes(kind)) return jsonError(`kind must be one of ${KINDS.join(', ')}`, 400);
    if (!OUTCOMES.includes(outcome)) return jsonError("outcome must be 'complete' or 'attempted'", 400);
    if (!METHODS.includes(method)) return jsonError(`method must be one of ${METHODS.join(', ')}`, 400);

    const failure_reason = cleanStr(body.failure_reason, 1000);
    const eta_at = cleanIso(body.eta_at);
    const confirmed = body.confirmed === true;

    if (outcome === 'complete' && !confirmed) {
      return jsonError('Confirm that the communication actually took place', 400);
    }
    if (outcome === 'attempted' && !failure_reason) {
      return jsonError('A failure reason is required for an attempted communication', 400);
    }
    if (kind === 'eta_notification' && outcome === 'complete' && !eta_at) {
      return jsonError('eta_at is required when recording an ETA notification', 400);
    }

    const { data: comm, error } = await auth.supabase
      .from('support_call_communications')
      .insert({
        support_call_id: sc.id,
        kind,
        outcome,
        method,
        recipient_name: cleanStr(body.recipient_name, 200),
        recipient_contact: cleanStr(body.recipient_contact, 200),
        eta_at,
        communicated_at: cleanIso(body.communicated_at) ?? new Date().toISOString(),
        notes: cleanStr(body.notes, 5000),
        failure_reason: outcome === 'attempted' ? failure_reason : null,
        confirmed,
        actor_id: auth.userId,
      })
      .select('*')
      .single();
    if (error) return dbError('communications', error);

    const update: Record<string, string> = {};
    const prev: Record<string, string> = {};
    const apply = (field: 'initial_notification_status' | 'eta_notification_status') => {
      const current = sc[field];
      // A completed checkpoint is never downgraded by a later "attempted".
      const next = outcome === 'complete' ? 'complete' : current === 'complete' ? 'complete' : 'attempted';
      if (next !== current) {
        prev[field] = current;
        update[field] = next;
      }
    };
    if (kind === 'initial_notification') apply('initial_notification_status');
    if (kind === 'eta_notification') apply('eta_notification_status');

    let support_call = sc;
    if (Object.keys(update).length) {
      const { data: updated, error: upErr } = await auth.supabase
        .from('support_calls')
        .update(update)
        .eq('id', sc.id)
        .select('*')
        .single();
      if (upErr) return dbError('communications.update', upErr);
      support_call = updated;
    }

    await ctx.audit(`communication_${kind}_${outcome}`, {
      related_id: comm.id,
      previous_value: Object.keys(prev).length ? prev : null,
      new_value: {
        kind,
        outcome,
        method,
        eta_at,
        recipient_name: comm.recipient_name,
        statuses: update,
      },
      reason: outcome === 'attempted' ? failure_reason : null,
    });
    await recomputeWorkflowStage(auth.supabase, sc.id);

    return NextResponse.json({ communication: comm, support_call }, { status: 201 });
  } catch (e) {
    return handleRouteError('POST /support-calls/[id]/communications', e);
  }
}
