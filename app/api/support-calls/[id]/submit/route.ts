import { NextRequest, NextResponse } from 'next/server';
import {
  actorRole,
  createPendingTicket,
  dbError,
  handleRouteError,
  jsonError,
  notifyRole,
  priorityToSeverity,
  recomputeWorkflowStage,
  scContext,
  syncAssignments,
  isUuid,
  readJson,
  type RouteCtx,
} from '@/app/lib/support-calls/server';
import { findDuplicateSupportCalls } from '@/app/lib/support-calls/duplicates';
import { notifySupportCallUsers } from '@/app/lib/support-calls/notify';

/**
 * POST /api/support-calls/[id]/submit
 * Promote a draft to an open support call and create the linked Pending ticket.
 */
export async function POST(request: NextRequest, { params }: RouteCtx) {
  try {
    const { id } = await params;
    const ctx = await scContext(request, id, 'manager');
    if (!ctx.ok) return ctx.response;
    const { auth, sc } = ctx;

    if (sc.overall_status !== 'draft') {
      return jsonError('Only draft support calls can be submitted', 400);
    }
    if (sc.ticket_id) {
      return jsonError('This draft already has a ticket', 409);
    }

    const description = (sc.original_description || '').trim();
    if (!description || description === '(draft)') return jsonError('Issue description is required before submit', 400);
    if (!sc.client) return jsonError('Client is required before submit', 400);
    if (!sc.report_method) return jsonError('Reporting method is required before submit', 400);
    if (!sc.reported_at) return jsonError('Date/time received is required before submit', 400);
    if (!sc.estate_or_building) return jsonError('Estate / Building is required before submit', 400);
    if (!sc.priority) return jsonError('Priority is required before submit', 400);

    const body = await readJson(request).catch(() => ({} as Record<string, unknown>));
    const ackReason = typeof body.duplicate_ack_reason === 'string' ? body.duplicate_ack_reason.trim() : '';

    const dup = await findDuplicateSupportCalls(auth.supabase, {
      supplier_invoice_number: sc.supplier_invoice_number,
      third_party_job_card_number: sc.third_party_job_card_number,
      po_number: sc.po_number,
      external_quote_reference: sc.external_quote_reference,
      client: sc.client,
      site_name: sc.onsite_location || sc.site_name,
      exclude_id: sc.id,
    });
    if (dup.exactMatch) {
      return jsonError(dup.safeHint || 'Duplicate reference', 409, { code: 'DUPLICATE', duplicates: dup });
    }
    if (dup.hasPossibleDuplicate && !ackReason) {
      return jsonError(dup.safeHint || 'Possible duplicate', 409, {
        code: 'POSSIBLE_DUPLICATE',
        requires_ack: true,
        duplicates: dup,
      });
    }

    const location = sc.location === 'remote' ? 'remote' : 'on-site';
    const onsite = sc.onsite_location || sc.site_name || null;

    const ticket = await createPendingTicket(auth.supabase, {
      hto_owner_id: sc.hto_owner_id,
      created_by: auth.userId,
      client: sc.client,
      location,
      issue: description,
      severity: priorityToSeverity(sc.priority),
      estate_or_building: sc.estate_or_building,
      cml_location: sc.cml_location,
      onsite_location: onsite,
      client_email: sc.reporter_email,
    });

    const { data: updated, error } = await auth.supabase
      .from('support_calls')
      .update({
        ticket_id: ticket.id,
        overall_status: 'open',
        workflow_stage: 'awaiting_assignment',
        original_description: description,
        site_name: onsite || sc.site_name,
        onsite_location: onsite,
      })
      .eq('id', sc.id)
      .eq('overall_status', 'draft')
      .select('*')
      .single();

    if (error || !updated) {
      await auth.supabase.from('tickets').delete().eq('id', ticket.id);
      return dbError('submit', error || { message: 'Submit failed' });
    }

    await ctx.audit('support_call_submitted', {
      previous_value: { overall_status: 'draft', ticket_id: null },
      new_value: {
        overall_status: 'open',
        ticket_id: ticket.id,
        ticket_number: ticket.ticket_number,
      },
    });

    if (dup.hasPossibleDuplicate && ackReason) {
      await auth.supabase.from('support_call_duplicate_decisions').insert({
        support_call_id: sc.id,
        actor_id: auth.userId,
        reason: ackReason,
        match_criteria: { matched_fields: dup.matches.map((m) => m.matched_fields) },
        matched_support_call_ids: dup.matches.map((m) => m.id),
      });
      await ctx.audit('duplicate_acknowledged', {
        new_value: { matches: dup.matches },
        reason: ackReason,
      });
    }

    let assignResult: unknown = null;
    const memberIds = Array.isArray(body.member_ids) ? (body.member_ids as unknown[]).filter(isUuid) : [];
    if (memberIds.length) {
      if (!onsite) {
        assignResult = { skipped: 'On-site location required before dispatch' };
      } else {
        const res = await syncAssignments(
          auth.supabase,
          { id: sc.id, ticket_id: ticket.id, hto_owner_id: sc.hto_owner_id },
          memberIds,
          isUuid(body.lead_id) ? body.lead_id : null,
          auth.userId
        );
        if (res.ok) {
          assignResult = { added: res.added, lead_id: res.lead_id };
          await notifySupportCallUsers(auth.supabase, {
            userIds: res.added.filter((uid) => uid !== auth.userId),
            type: 'support_call_assigned',
            title: `Support call ${sc.support_call_number} assigned`,
            message: `You have been assigned to support call ${sc.support_call_number}.`,
            ticket_id: ticket.id,
            triggering_user_id: auth.userId,
            triggering_user_role: notifyRole(auth),
          });
        }
      }
    }

    const stage = await recomputeWorkflowStage(auth.supabase, sc.id);
    void actorRole;

    return NextResponse.json({
      support_call: { ...updated, workflow_stage: stage?.stage ?? updated.workflow_stage },
      ticket: { id: ticket.id, ticket_number: ticket.ticket_number, status: 'pending' },
      assignment: assignResult,
    });
  } catch (e) {
    return handleRouteError('POST /support-calls/[id]/submit', e);
  }
}
