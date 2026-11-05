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
 * POST /api/support-calls/[id]/eta
 *  { new_eta, source?, notes?, assignment_id?, partner_assignment_id? } — record ETA (never creates a visit)
 *  { action: 'sent_to_client', eta_event_id, confirm: true } — HTO confirms selected ETA was sent to client
 */
export async function POST(request: NextRequest, { params }: RouteCtx) {
  try {
    const { id } = await params;
    const body = await readJson(request);

    if (body.action === 'sent_to_client') {
      const ctx = await scContext(request, id, 'manager', { requireOpen: true });
      if (!ctx.ok) return ctx.response;
      const { auth, sc } = ctx;
      if (body.confirm !== true) {
        return jsonError(
          'ETA cannot be marked as sent to the client. Tick "ETA SENT TO CLIENT" to confirm after you have notified the customer.',
          400
        );
      }
      if (!isUuid(body.eta_event_id)) {
        return jsonError(
          'ETA cannot be marked as sent. Select an ETA entry from the list (member or HTO) before confirming.',
          400
        );
      }
      const { data: event, error: evErr } = await auth.supabase
        .from('support_call_eta_events')
        .select('*')
        .eq('id', body.eta_event_id)
        .eq('support_call_id', sc.id)
        .maybeSingle();
      if (evErr) return dbError('eta.sent.lookup', evErr);
      if (!event) {
        return jsonError(
          'ETA cannot be marked as sent. The selected ETA entry was not found on this support call. Refresh and choose again.',
          404
        );
      }

      const now = new Date().toISOString();
      const { data: updated, error } = await auth.supabase
        .from('support_calls')
        .update({
          eta_notification_status: 'complete',
          eta_sent_event_id: event.id,
          eta_sent_at: now,
          eta_sent_by: auth.userId,
        })
        .eq('id', sc.id)
        .select('*')
        .single();
      if (error) return dbError('eta.sent', error);

      await auth.supabase.from('support_call_communications').insert({
        support_call_id: sc.id,
        kind: 'eta_notification',
        outcome: 'complete',
        method: 'Other',
        recipient_name: null,
        recipient_contact: null,
        eta_at: event.new_eta,
        communicated_at: now,
        notes: `ETA sent to client (event ${event.id})`,
        confirmed: true,
        actor_id: auth.userId,
      });

      await ctx.audit('eta_sent_to_client', {
        related_id: event.id,
        new_value: {
          eta_event_id: event.id,
          eta_at: event.new_eta,
          sent_at: now,
          sent_by: auth.userId,
        },
      });

      return NextResponse.json({ support_call: updated, eta_event: event });
    }

    const ctx = await scContext(request, id, 'manager_or_assignee', { requireOpen: true });
    if (!ctx.ok) return ctx.response;
    const { auth, sc, assignment } = ctx;

    const newEta = cleanIso(body.new_eta);
    if (!newEta) {
      return jsonError(
        'ETA cannot be saved. Enter a valid date and time for the expected arrival before continuing.',
        400
      );
    }

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
        if (!data) {
          return jsonError(
            'ETA cannot be saved. The selected technician assignment does not belong to this support call.',
            400
          );
        }
        assignmentId = data.id;
      } else if (isUuid(body.partner_assignment_id)) {
        const { data } = await auth.supabase
          .from('support_call_partners')
          .select('id')
          .eq('id', body.partner_assignment_id)
          .eq('support_call_id', sc.id)
          .maybeSingle();
        if (!data) {
          return jsonError(
            'ETA cannot be saved. The selected partner assignment does not belong to this support call.',
            400
          );
        }
        partnerAssignmentId = data.id;
      } else {
        assignmentId = assignment?.id ?? null;
      }
    } else {
      assignmentId = assignment?.id ?? null;
      if (!assignmentId) {
        return jsonError(
          'ETA cannot be saved. You are not currently assigned to this support call.',
          403
        );
      }
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
        message: `New ETA ${new Date(newEta).toLocaleString('en-ZA')} — select it and tick ETA SENT TO CLIENT when the customer has been notified.`,
        ticket_id: sc.ticket_id,
        triggering_user_id: auth.userId,
        triggering_user_role: notifyRole(auth),
      });
    }

    // Intentionally does NOT create or touch support_call_visits — an ETA is not a visit.
    return NextResponse.json({ eta_event: event }, { status: 201 });
  } catch (e) {
    return handleRouteError('POST /support-calls/[id]/eta', e);
  }
}
