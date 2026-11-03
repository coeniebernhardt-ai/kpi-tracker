import { NextRequest, NextResponse } from 'next/server';
import {
  cleanIso,
  cleanStr,
  dbError,
  handleRouteError,
  isUuid,
  jsonError,
  notifyRole,
  readJson,
  scContext,
  type RouteCtx,
} from '@/app/lib/support-calls/server';
import { notifySupportCallUsers } from '@/app/lib/support-calls/notify';

/**
 * POST /api/support-calls/[id]/eta  { new_eta, source?, notes?, assignment_id?, partner_assignment_id? }
 * Managers or assignees. Assignees always record against their own assignment.
 */
export async function POST(request: NextRequest, { params }: RouteCtx) {
  try {
    const { id } = await params;
    const ctx = await scContext(request, id, 'manager_or_assignee', { requireOpen: true });
    if (!ctx.ok) return ctx.response;
    const { auth, sc, assignment } = ctx;
    const body = await readJson(request);

    const newEta = cleanIso(body.new_eta);
    if (!newEta) return jsonError('new_eta must be a valid date/time', 400);

    let assignmentId: string | null = null;
    let partnerAssignmentId: string | null = null;

    if (auth.canManage) {
      if (isUuid(body.assignment_id)) {
        const { data } = await auth.supabase
          .from('support_call_assignments')
          .select('id')
          .eq('id', body.assignment_id)
          .eq('support_call_id', sc.id)
          .maybeSingle();
        if (!data) return jsonError('assignment_id does not belong to this support call', 400);
        assignmentId = data.id;
      } else if (isUuid(body.partner_assignment_id)) {
        const { data } = await auth.supabase
          .from('support_call_partners')
          .select('id')
          .eq('id', body.partner_assignment_id)
          .eq('support_call_id', sc.id)
          .maybeSingle();
        if (!data) return jsonError('partner_assignment_id does not belong to this support call', 400);
        partnerAssignmentId = data.id;
      } else {
        assignmentId = assignment?.id ?? null;
      }
    } else {
      assignmentId = assignment?.id ?? null;
    }

    let prevQuery = auth.supabase
      .from('support_call_eta_events')
      .select('new_eta')
      .eq('support_call_id', sc.id)
      .order('created_at', { ascending: false })
      .limit(1);
    if (assignmentId) prevQuery = prevQuery.eq('assignment_id', assignmentId);
    else if (partnerAssignmentId) prevQuery = prevQuery.eq('partner_assignment_id', partnerAssignmentId);
    const { data: prevRows } = await prevQuery;
    const previous_eta = prevRows?.[0]?.new_eta ?? null;

    const { data: event, error } = await auth.supabase
      .from('support_call_eta_events')
      .insert({
        support_call_id: sc.id,
        assignment_id: assignmentId,
        partner_assignment_id: partnerAssignmentId,
        previous_eta,
        new_eta: newEta,
        source: cleanStr(body.source, 100) ?? (auth.canManage ? 'manager' : 'technician'),
        notes: cleanStr(body.notes, 2000),
        actor_id: auth.userId,
      })
      .select('*')
      .single();
    if (error) return dbError('eta', error);

    if (assignment && !assignment.first_update_at) {
      await auth.supabase
        .from('support_call_assignments')
        .update({ first_update_at: new Date().toISOString() })
        .eq('id', assignment.id);
    }

    await ctx.audit('eta_updated', {
      related_id: event.id,
      previous_value: { eta: previous_eta },
      new_value: { eta: newEta, assignment_id: assignmentId, partner_assignment_id: partnerAssignmentId },
      reason: cleanStr(body.notes, 500),
    });

    if (!auth.canManage) {
      await notifySupportCallUsers(auth.supabase, {
        userIds: [sc.hto_owner_id],
        type: 'support_call_attention',
        title: `ETA updated on ${sc.support_call_number}`,
        message: `New ETA ${new Date(newEta).toLocaleString('en-ZA')} — remember to notify the customer.`,
        ticket_id: sc.ticket_id,
        triggering_user_id: auth.userId,
        triggering_user_role: notifyRole(auth),
      });
    }

    return NextResponse.json({ eta_event: event }, { status: 201 });
  } catch (e) {
    return handleRouteError('POST /support-calls/[id]/eta', e);
  }
}
