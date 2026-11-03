import { NextRequest, NextResponse } from 'next/server';
import {
  cleanStr,
  handleRouteError,
  isUuid,
  jsonError,
  notifyRole,
  readJson,
  recomputeWorkflowStage,
  scContext,
} from '@/app/lib/support-calls/server';
import { notifySupportCallUsers } from '@/app/lib/support-calls/notify';

/**
 * POST /api/support-calls/[id]/quotes/[quoteId]/decide
 * { decision: 'approve' | 'reject', reason?, next_step? } — managers only.
 * The update is atomic and only succeeds while the quote is still 'pending'.
 * Rejection requires a reason and a next step.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; quoteId: string }> }
) {
  try {
    const { id, quoteId } = await params;
    const ctx = await scContext(request, id, 'manager', { requireOpen: true });
    if (!ctx.ok) return ctx.response;
    const { auth, sc } = ctx;
    if (!isUuid(quoteId)) return jsonError('Invalid quote id', 400);
    const body = await readJson(request);

    const decision = body.decision;
    if (decision !== 'approve' && decision !== 'reject') {
      return jsonError("decision must be 'approve' or 'reject'", 400);
    }
    const reason = cleanStr(body.reason, 2000);
    const next_step = body.next_step === 'revise_same_supplier' || body.next_step === 'different_supplier'
      ? body.next_step
      : null;

    if (decision === 'reject') {
      if (!reason) return jsonError('A reason is required to reject a quote', 400);
      if (!next_step) {
        return jsonError("next_step must be 'revise_same_supplier' or 'different_supplier'", 400);
      }
    }

    const { data: updated, error } = await auth.supabase
      .from('support_call_quotes')
      .update({
        status: decision === 'approve' ? 'approved' : 'rejected',
        decision_by: auth.userId,
        decision_at: new Date().toISOString(),
        decision_reason: reason,
        next_step: decision === 'reject' ? next_step : null,
      })
      .eq('id', quoteId)
      .eq('support_call_id', sc.id)
      .eq('status', 'pending')
      .select('*')
      .maybeSingle();
    if (error) return jsonError(error.message, 500);
    if (!updated) {
      return jsonError('Quote not found or already decided', 409, { code: 'QUOTE_NOT_PENDING' });
    }

    await ctx.audit(decision === 'approve' ? 'quote_approved' : 'quote_rejected', {
      related_id: updated.id,
      previous_value: { status: 'pending' },
      new_value: {
        status: updated.status,
        supplier_name: updated.supplier_name,
        amount: updated.amount,
        next_step: updated.next_step,
      },
      reason,
    });

    const { data: assignees } = await auth.supabase
      .from('support_call_assignments')
      .select('member_id')
      .eq('support_call_id', sc.id);
    await notifySupportCallUsers(auth.supabase, {
      userIds: [sc.hto_owner_id, ...(assignees || []).map((x: { member_id: string }) => x.member_id)].filter(
        (u) => u !== auth.userId
      ),
      type: 'support_call_quote_decision',
      title: `Quote ${updated.status} on ${sc.support_call_number}`,
      message: `${updated.supplier_name} quote was ${updated.status}${reason ? `: ${reason}` : ''}.`,
      ticket_id: sc.ticket_id,
      triggering_user_id: auth.userId,
      triggering_user_role: notifyRole(auth),
    });

    const stage = await recomputeWorkflowStage(auth.supabase, sc.id);
    return NextResponse.json({ quote: updated, workflow: stage });
  } catch (e) {
    return handleRouteError('POST /support-calls/[id]/quotes/[quoteId]/decide', e);
  }
}
