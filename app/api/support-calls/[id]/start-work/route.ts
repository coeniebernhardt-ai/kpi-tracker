import { NextRequest, NextResponse } from 'next/server';
import {
  handleRouteError,
  jsonError,
  recomputeWorkflowStage,
  scContext,
  type RouteCtx,
} from '@/app/lib/support-calls/server';

/**
 * POST /api/support-calls/[id]/start-work
 * The assigned technician starts work. Logs assignment.started_work_at (once)
 * and moves a PENDING ticket to OPEN exactly once (atomic conditional update).
 */
export async function POST(request: NextRequest, { params }: RouteCtx) {
  try {
    const { id } = await params;
    const ctx = await scContext(request, id, 'manager_or_assignee', { requireOpen: true });
    if (!ctx.ok) return ctx.response;
    const { auth, sc, assignment } = ctx;

    if (!assignment) {
      return jsonError('Only assigned team members can start work on this support call', 403);
    }

    const now = new Date().toISOString();
    let startedNow = false;
    let startedAt = assignment.started_work_at;

    if (!assignment.started_work_at) {
      // Conditional update so a double-click / retry cannot overwrite the first timestamp.
      const { data: updated, error } = await auth.supabase
        .from('support_call_assignments')
        .update({
          started_work_at: now,
          acknowledged_at: assignment.acknowledged_at ?? now,
        })
        .eq('id', assignment.id)
        .is('started_work_at', null)
        .select('started_work_at')
        .maybeSingle();
      if (error) return jsonError(error.message, 500);
      if (updated) {
        startedNow = true;
        startedAt = updated.started_work_at;
      } else {
        const { data: current } = await auth.supabase
          .from('support_call_assignments')
          .select('started_work_at')
          .eq('id', assignment.id)
          .maybeSingle();
        startedAt = current?.started_work_at ?? null;
      }
    }

    // pending -> open exactly once (only if still pending)
    const { data: opened } = await auth.supabase
      .from('tickets')
      .update({ status: 'open' })
      .eq('id', sc.ticket_id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();

    if (startedNow) {
      await ctx.audit('work_started', {
        related_id: assignment.id,
        new_value: { started_work_at: startedAt, member_id: auth.userId },
      });
    }
    if (opened) {
      await ctx.audit('ticket_status_changed', {
        previous_value: { status: 'pending' },
        new_value: { status: 'open' },
        reason: 'Technician started work',
      });
    }

    const stage = await recomputeWorkflowStage(auth.supabase, sc.id);

    return NextResponse.json({
      started_work_at: startedAt,
      already_started: !startedNow,
      ticket_opened: Boolean(opened),
      workflow: stage,
    });
  } catch (e) {
    return handleRouteError('POST /support-calls/[id]/start-work', e);
  }
}
