import { NextRequest, NextResponse } from 'next/server';
import {
  actorRole,
  authenticateManager,
  cleanStr,
  dbError,
  handleRouteError,
  isUuid,
  jsonError,
  loadProfilesById,
  notifyRole,
  parsePriority,
  priorityToSeverity,
  readJson,
  recomputeWorkflowStage,
  severityToPriority,
  syncAssignments,
  syncTicketAssignees,
} from '@/app/lib/support-calls/server';
import { parseIntake } from '@/app/lib/support-calls/intake';
import { findDuplicateSupportCalls } from '@/app/lib/support-calls/duplicates';
import { nextSupportCallNumber } from '@/app/lib/support-calls/numbers';
import { writeSupportCallAudit } from '@/app/lib/support-calls/audit';
import { notifySupportCallUsers } from '@/app/lib/support-calls/notify';

/**
 * POST /api/support-calls/from-ticket
 * Converts an EXISTING ticket into a support call. The ticket is preserved
 * (status, number, history untouched) – no duplicate ticket is created.
 */
export async function POST(request: NextRequest) {
  try {
    const a = await authenticateManager(request);
    if (!a.ok) return a.response;
    const { auth } = a;
    const supabase = auth.supabase;
    const body = await readJson(request);

    if (!isUuid(body.ticket_id)) return jsonError('ticket_id is required', 400);

    const { data: ticket } = await supabase
      .from('tickets')
      .select(
        'id, ticket_number, status, client, issue, severity, location, estate_or_building, cml_location, onsite_location, client_email, assigned_to_array, user_id, created_at'
      )
      .eq('id', body.ticket_id)
      .maybeSingle();
    if (!ticket) return jsonError('Ticket not found', 404);
    if (ticket.status === 'closed') return jsonError('A closed ticket cannot be converted', 409);

    const { data: existing } = await supabase
      .from('support_calls')
      .select('id, support_call_number')
      .eq('ticket_id', ticket.id)
      .maybeSingle();
    if (existing) {
      return jsonError(`Ticket already linked to ${existing.support_call_number}`, 409, {
        code: 'ALREADY_CONVERTED',
        support_call_id: existing.id,
      });
    }

    // HTO owner
    let htoOwnerId: string | null = null;
    if (isUuid(body.hto_owner_id)) htoOwnerId = body.hto_owner_id;
    else if (auth.isHto) htoOwnerId = auth.userId;
    if (!htoOwnerId) return jsonError('Select an HTO owner (hto_owner_id)', 400);
    const owners = await loadProfilesById(supabase, [htoOwnerId]);
    const owner = owners[htoOwnerId];
    if (!owner || owner.is_active === false || !owner.is_hto) {
      return jsonError('hto_owner_id must be an active HTO', 400);
    }

    const parsed = parseIntake(body);
    if (parsed.error) return jsonError(parsed.error, 400);
    const v = parsed.values;

    const description = cleanStr(body.original_description, 20000) || ticket.issue;
    if (!description) return jsonError('Ticket has no description; provide original_description', 400);
    const clientName = (v.client as string | null) || ticket.client || null;
    const priority =
      'priority' in body ? parsePriority(body.priority, 'Medium') : severityToPriority(ticket.severity);
    const location =
      (v.location as 'on-site' | 'remote' | null) ??
      (ticket.location === 'on-site' || ticket.location === 'remote' ? ticket.location : 'remote');

    const dup = await findDuplicateSupportCalls(supabase, {
      supplier_invoice_number: v.supplier_invoice_number as string | null,
      third_party_job_card_number: v.third_party_job_card_number as string | null,
      po_number: v.po_number as string | null,
      external_quote_reference: v.external_quote_reference as string | null,
      client: clientName,
      site_name: v.site_name as string | null,
    });
    const ackReason = cleanStr(body.duplicate_ack_reason, 1000);
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

    let sc: Record<string, unknown> | null = null;
    let lastErr: { message: string; code?: string } | null = null;
    for (let attempt = 0; attempt < 5 && !sc; attempt++) {
      const support_call_number = await nextSupportCallNumber(supabase);
      const { data, error } = await supabase
        .from('support_calls')
        .insert({
          ...v,
          support_call_number,
          ticket_id: ticket.id,
          hto_owner_id: htoOwnerId,
          created_by: auth.userId,
          priority,
          client: clientName,
          location,
          estate_or_building: (v.estate_or_building as string | null) ?? ticket.estate_or_building ?? null,
          cml_location: (v.cml_location as string | null) ?? ticket.cml_location ?? null,
          onsite_location: (v.onsite_location as string | null) ?? (ticket as { onsite_location?: string | null }).onsite_location ?? null,
          site_name: (v.onsite_location as string | null) ?? (ticket as { onsite_location?: string | null }).onsite_location ?? null,
          reporter_email: (v.reporter_email as string | null) ?? ticket.client_email ?? null,
          overall_status: 'open',
          workflow_stage: 'awaiting_assignment',
          original_description: description,
          reported_at: (v.reported_at as string | null) ?? ticket.created_at ?? new Date().toISOString(),
        })
        .select('*')
        .single();
      if (!error && data) sc = data as Record<string, unknown>;
      else {
        lastErr = error;
        if (error?.code !== '23505' || !error.message.includes('support_call_number')) break;
      }
    }
    if (!sc) return dbError('from-ticket', lastErr || { message: 'Insert failed' });
    const scId = sc.id as string;

    // Ticket is preserved; only make sure the HTO owner can see it.
    const previousAssignees: string[] = Array.isArray(ticket.assigned_to_array) ? ticket.assigned_to_array : [];
    const nextAssignees = await syncTicketAssignees(supabase, ticket.id, htoOwnerId, previousAssignees);

    await writeSupportCallAudit(supabase, {
      support_call_id: scId,
      ticket_id: ticket.id,
      actor_id: auth.userId,
      actor_role: actorRole(auth),
      event_type: 'support_call_created_from_ticket',
      previous_value: {
        ticket_status: ticket.status,
        assigned_to_array: previousAssignees,
        severity: ticket.severity,
      },
      new_value: {
        support_call_number: sc.support_call_number,
        ticket_number: ticket.ticket_number,
        hto_owner_id: htoOwnerId,
        assigned_to_array: nextAssignees,
        priority,
        ticket_severity_unchanged: priorityToSeverity(priority) === ticket.severity,
      },
      source: 'api',
    });

    if (dup.hasPossibleDuplicate && ackReason) {
      await supabase.from('support_call_duplicate_decisions').insert({
        support_call_id: scId,
        actor_id: auth.userId,
        reason: ackReason,
        match_criteria: { matched_fields: dup.matches.map((m) => m.matched_fields) },
        matched_support_call_ids: dup.matches.map((m) => m.id),
      });
      await writeSupportCallAudit(supabase, {
        support_call_id: scId,
        ticket_id: ticket.id,
        actor_id: auth.userId,
        actor_role: actorRole(auth),
        event_type: 'duplicate_acknowledged',
        new_value: { matches: dup.matches },
        reason: ackReason,
        source: 'api',
      });
    }

    const memberIds = Array.isArray(body.member_ids) ? (body.member_ids as unknown[]).filter(isUuid) : [];
    let assignment: unknown = null;
    if (memberIds.length) {
      const res = await syncAssignments(
        supabase,
        { id: scId, ticket_id: ticket.id, hto_owner_id: htoOwnerId },
        memberIds,
        isUuid(body.lead_id) ? body.lead_id : null,
        auth.userId
      );
      if (res.ok) {
        assignment = { added: res.added, lead_id: res.lead_id };
        await writeSupportCallAudit(supabase, {
          support_call_id: scId,
          ticket_id: ticket.id,
          actor_id: auth.userId,
          actor_role: actorRole(auth),
          event_type: 'assignments_changed',
          previous_value: res.previous,
          new_value: res.next,
          source: 'api',
        });
        await notifySupportCallUsers(supabase, {
          userIds: res.added.filter((id) => id !== auth.userId),
          type: 'support_call_assigned',
          title: `Support call ${sc.support_call_number} assigned`,
          message: `You have been assigned to support call ${sc.support_call_number}.`,
          ticket_id: ticket.id,
          triggering_user_id: auth.userId,
          triggering_user_role: notifyRole(auth),
        });
      } else {
        assignment = { error: res.error };
      }
    }

    const stage = await recomputeWorkflowStage(supabase, scId);

    return NextResponse.json(
      {
        support_call: { ...sc, workflow_stage: stage?.stage ?? sc.workflow_stage },
        ticket: { id: ticket.id, ticket_number: ticket.ticket_number, status: ticket.status },
        assignment,
      },
      { status: 201 }
    );
  } catch (e) {
    return handleRouteError('POST /support-calls/from-ticket', e);
  }
}
