import { NextRequest, NextResponse } from 'next/server';
import {
  cleanStr,
  handleRouteError,
  jsonError,
  readJson,
  scContext,
  type RouteCtx,
} from '@/app/lib/support-calls/server';

/**
 * POST /api/support-calls/[id]/cancel { reason, explanation, ticket_action: 'close' | 'leave_open' } — managers only.
 * The ticket decision is explicit: close it, or leave it open for normal handling.
 */
export async function POST(request: NextRequest, { params }: RouteCtx) {
  try {
    const { id } = await params;
    const ctx = await scContext(request, id, 'manager', { requireOpen: true });
    if (!ctx.ok) return ctx.response;
    const { auth, sc } = ctx;
    const supabase = auth.supabase;
    const body = await readJson(request);

    const reason = cleanStr(body.reason, 200);
    const explanation = cleanStr(body.explanation, 5000);
    const ticket_action = body.ticket_action;
    if (!reason) return jsonError('A cancellation reason is required', 400);
    if (!explanation) return jsonError('An explanation is required', 400);
    if (ticket_action !== 'close' && ticket_action !== 'leave_open') {
      return jsonError("ticket_action must be 'close' or 'leave_open'", 400);
    }

    const now = new Date().toISOString();
    const { data: cancelled, error } = await supabase
      .from('support_calls')
      .update({
        overall_status: 'cancelled',
        workflow_stage: 'cancelled',
        cancel_reason: reason,
        cancel_explanation: explanation,
        cancel_ticket_action: ticket_action,
        cancelled_at: now,
        cancelled_by: auth.userId,
      })
      .eq('id', sc.id)
      .eq('overall_status', 'open')
      .select('*')
      .maybeSingle();
    if (error) return jsonError(error.message, 500);
    if (!cancelled) return jsonError('Support call is no longer open', 409);

    // Any outstanding signing link must stop working.
    await supabase
      .from('support_call_signing_tokens')
      .update({ revoked_at: now })
      .eq('support_call_id', sc.id)
      .is('revoked_at', null)
      .is('used_at', null);

    let ticketStatus: string | null = null;
    const { data: ticket } = await supabase
      .from('tickets')
      .select('id, status, created_at')
      .eq('id', sc.ticket_id)
      .maybeSingle();
    ticketStatus = ticket?.status ?? null;

    if (ticket && ticket_action === 'close' && ticket.status !== 'closed') {
      const { error: tErr } = await supabase
        .from('tickets')
        .update({
          status: 'closed',
          closed_at: now,
          resolution: `Support call ${sc.support_call_number} cancelled: ${reason}`,
          response_time_minutes: Math.max(0, Math.round((Date.now() - new Date(ticket.created_at).getTime()) / 60000)),
        })
        .eq('id', sc.ticket_id);
      if (!tErr) ticketStatus = 'closed';
      else console.error('[support-calls] cancel: ticket close failed', tErr.message);
    }

    await ctx.audit('support_call_cancelled', {
      previous_value: { overall_status: 'open', ticket_status: ticket?.status ?? null },
      new_value: { overall_status: 'cancelled', ticket_action, ticket_status: ticketStatus },
      reason: `${reason}: ${explanation}`,
    });

    return NextResponse.json({ support_call: cancelled, ticket_status: ticketStatus });
  } catch (e) {
    return handleRouteError('POST /support-calls/[id]/cancel', e);
  }
}
