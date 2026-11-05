import { NextRequest, NextResponse } from 'next/server';
import {
  handleRouteError,
  isUuid,
  jsonError,
  notifyRole,
  readJson,
  recomputeWorkflowStage,
  scContext,
  syncAssignments,
  type RouteCtx,
} from '@/app/lib/support-calls/server';
import { notifySupportCallUsers } from '@/app/lib/support-calls/notify';

/**
 * POST /api/support-calls/[id]/assign  { member_ids: string[], lead_id?: string }
 * Syncs support_call_assignments + tickets.assigned_to_array and notifies newly added members.
 */
export async function POST(request: NextRequest, { params }: RouteCtx) {
  try {
    const { id } = await params;
    const ctx = await scContext(request, id, 'manager', { requireOpen: true });
    if (!ctx.ok) return ctx.response;
    const { auth, sc } = ctx;
    const body = await readJson(request);

    if (sc.overall_status === 'draft' || !sc.ticket_id) {
      return jsonError('Submit the support call (create the linked ticket) before assigning technicians', 400);
    }
    const onsite = (sc as { onsite_location?: string | null }).onsite_location || sc.site_name;
    if (!onsite || !String(onsite).trim()) {
      return jsonError('On-site location is required before dispatch', 400);
    }

    if (!Array.isArray(body.member_ids)) return jsonError('member_ids must be an array', 400);
    const memberIds = (body.member_ids as unknown[]).filter(isUuid);
    const leadId = isUuid(body.lead_id) ? body.lead_id : null;

    const res = await syncAssignments(auth.supabase, sc, memberIds, leadId, auth.userId);
    if (!res.ok) return jsonError(res.error, res.status, res.extra);

    await ctx.audit('assignments_changed', {
      previous_value: res.previous,
      new_value: res.next,
      reason: typeof body.reason === 'string' ? body.reason.slice(0, 500) : null,
    });

    await notifySupportCallUsers(auth.supabase, {
      userIds: res.added.filter((uid) => uid !== auth.userId),
      type: 'support_call_assigned',
      title: `Support call ${sc.support_call_number} assigned`,
      message: `You have been assigned to support call ${sc.support_call_number}.`,
      ticket_id: sc.ticket_id,
      triggering_user_id: auth.userId,
      triggering_user_role: notifyRole(auth),
    });

    const stage = await recomputeWorkflowStage(auth.supabase, sc.id);
    const { data: assignments } = await auth.supabase
      .from('support_call_assignments')
      .select('*')
      .eq('support_call_id', sc.id);

    return NextResponse.json({
      assignments: assignments || [],
      added: res.added,
      removed: res.removed,
      lead_id: res.lead_id,
      workflow: stage,
    });
  } catch (e) {
    return handleRouteError('POST /support-calls/[id]/assign', e);
  }
}
