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
  type RouteCtx,
} from '@/app/lib/support-calls/server';
import { notifySupportCallUsers } from '@/app/lib/support-calls/notify';

/**
 * POST /api/support-calls/[id]/contributions/review
 * { contribution_id, action: 'accept' | 'return', correction_notes? }  — managers only.
 * Returning requires correction notes. Only 'submitted' contributions can be reviewed (atomic).
 */
export async function POST(request: NextRequest, { params }: RouteCtx) {
  try {
    const { id } = await params;
    const ctx = await scContext(request, id, 'manager', { requireOpen: true });
    if (!ctx.ok) return ctx.response;
    const { auth, sc } = ctx;
    const body = await readJson(request);

    if (!isUuid(body.contribution_id)) return jsonError('contribution_id is required', 400);
    const action = body.action;
    if (action !== 'accept' && action !== 'return') {
      return jsonError("action must be 'accept' or 'return'", 400);
    }
    const notes = cleanStr(body.correction_notes, 5000);
    if (action === 'return' && !notes) {
      return jsonError('Explain what needs correcting (correction_notes)', 400);
    }

    // Correction may be requested on submitted or previously approved work
    let query = auth.supabase
      .from('support_call_contributions')
      .update({
        status: action === 'accept' ? 'approved' : 'returned',
        reviewed_at: new Date().toISOString(),
        reviewed_by: auth.userId,
        correction_notes: action === 'return' ? notes : undefined,
      })
      .eq('id', body.contribution_id)
      .eq('support_call_id', sc.id);
    if (action === 'return') query = query.in('status', ['submitted', 'approved']);
    else query = query.eq('status', 'submitted');

    const { data: updated, error } = await query.select('*').maybeSingle();
    if (error) return jsonError(error.message, 500);
    if (!updated) {
      return jsonError('Contribution not found or cannot be reviewed in its current state', 409);
    }

    if (action === 'return') {
      // Re-open member work so they can correct and COMPLETE MY WORK again
      await auth.supabase
        .from('support_call_assignments')
        .update({ work_completed_at: null, work_completed_by: null })
        .eq('id', updated.assignment_id);
    }

    await ctx.audit(action === 'accept' ? 'contribution_approved' : 'contribution_correction_requested', {
      related_id: updated.id,
      previous_value: { status: 'submitted' },
      new_value: { status: updated.status, revision: updated.revision },
      reason: action === 'return' ? notes : cleanStr(body.correction_notes, 1000),
    });

    const { data: owner } = await auth.supabase
      .from('support_call_assignments')
      .select('member_id')
      .eq('id', updated.assignment_id)
      .maybeSingle();

    if (action === 'return' && owner?.member_id && owner.member_id !== auth.userId) {
      await notifySupportCallUsers(auth.supabase, {
        userIds: [owner.member_id],
        type: 'support_call_contribution_returned',
        title: `Correction requested on ${sc.support_call_number}`,
        message: notes || 'Your technical work needs corrections. Please update and COMPLETE MY WORK again.',
        ticket_id: sc.ticket_id,
        triggering_user_id: auth.userId,
        triggering_user_role: notifyRole(auth),
      });
    }

    const stage = await recomputeWorkflowStage(auth.supabase, sc.id);
    return NextResponse.json({ contribution: updated, workflow: stage });
  } catch (e) {
    return handleRouteError('POST /support-calls/[id]/contributions/review', e);
  }
}
