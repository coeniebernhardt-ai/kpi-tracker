import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  authenticate,
  authenticateManager,
  cleanStr,
  createPendingTicket,
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
  syncAssignments,
  actorRole,
} from '@/app/lib/support-calls/server';
import { applyReporterContact, parseIntake } from '@/app/lib/support-calls/intake';
import { findDuplicateSupportCalls } from '@/app/lib/support-calls/duplicates';
import { nextSupportCallNumber } from '@/app/lib/support-calls/numbers';
import { writeSupportCallAudit } from '@/app/lib/support-calls/audit';
import { notifySupportCallUsers } from '@/app/lib/support-calls/notify';

/**
 * GET /api/support-calls
 * Managers see everything; members only calls they are assigned to.
 * Query: status=open|closed|cancelled|draft|all, stage, priority, q, include=members, limit
 */
export async function GET(request: NextRequest) {
  try {
    const a = await authenticate(request);
    if (!a.ok) return a.response;
    const { auth } = a;
    const sp = request.nextUrl.searchParams;

    const status = sp.get('status') || 'all';
    const stage = sp.get('stage');
    const priority = sp.get('priority');
    const search = (sp.get('q') || '').trim();
    const limit = Math.min(Math.max(parseInt(sp.get('limit') || '500', 10) || 500, 1), 1000);

    let scopedIds: string[] | null = null;
    if (!auth.canManage) {
      const { data: mine } = await auth.supabase
        .from('support_call_assignments')
        .select('support_call_id')
        .eq('member_id', auth.userId);
      scopedIds = (mine || []).map((r: { support_call_id: string }) => r.support_call_id);
      if (!scopedIds.length) {
        return NextResponse.json({ support_calls: [], can_manage: false });
      }
    }

    let query = auth.supabase
      .from('support_calls')
      .select(
        'id, support_call_number, ticket_id, hto_owner_id, priority, overall_status, workflow_stage, client, site_name, estate_or_building, cml_location, onsite_location, location, original_description, reporter_name, reported_at, initial_notification_status, eta_notification_status, created_at, updated_at, closed_at, cancelled_at'
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (scopedIds) query = query.in('id', scopedIds);
    if (status !== 'all') query = query.eq('overall_status', status);
    if (stage) query = query.eq('workflow_stage', stage);
    if (priority) query = query.eq('priority', priority);
    if (search) {
      const s = search.replace(/[%,()]/g, ' ');
      query = query.or(
        `support_call_number.ilike.%${s}%,client.ilike.%${s}%,site_name.ilike.%${s}%,original_description.ilike.%${s}%,reporter_name.ilike.%${s}%`
      );
    }

    const { data: calls, error } = await query;
    if (error) return dbError('list', error);
    const rows = (calls || []) as Array<Record<string, unknown> & { id: string; ticket_id: string | null; hto_owner_id: string }>;

    const ids = rows.map((r) => r.id);
    const ticketIds = rows.map((r) => r.ticket_id).filter((id): id is string => Boolean(id));
    const [assignRes, ticketRes] = await Promise.all([
      ids.length
        ? auth.supabase
            .from('support_call_assignments')
            .select('support_call_id, member_id, is_lead, acknowledged_at, started_work_at')
            .in('support_call_id', ids)
        : Promise.resolve({ data: [] }),
      ticketIds.length
        ? auth.supabase.from('tickets').select('id, ticket_number, status').in('id', ticketIds)
        : Promise.resolve({ data: [] }),
    ]);

    const assignments = (assignRes.data || []) as Array<{
      support_call_id: string;
      member_id: string;
      is_lead: boolean;
      acknowledged_at: string | null;
      started_work_at: string | null;
    }>;
    const profiles = await loadProfilesById(auth.supabase, [
      ...rows.map((r) => r.hto_owner_id),
      ...assignments.map((x) => x.member_id),
    ]);
    const ticketMap = new Map(
      ((ticketRes.data || []) as Array<{ id: string; ticket_number: string; status: string }>).map((t) => [t.id, t])
    );

    const support_calls = rows.map((r) => ({
      ...r,
      ticket: r.ticket_id ? ticketMap.get(r.ticket_id) ?? null : null,
      hto_owner_name: profiles[r.hto_owner_id]?.full_name ?? null,
      assignments: assignments
        .filter((x) => x.support_call_id === r.id)
        .map((x) => ({
          member_id: x.member_id,
          full_name: profiles[x.member_id]?.full_name ?? null,
          is_lead: x.is_lead,
          acknowledged_at: x.acknowledged_at,
          started_work_at: x.started_work_at,
        })),
    }));

    const payload: Record<string, unknown> = { support_calls, can_manage: auth.canManage };

    if (auth.canManage && sp.get('include') === 'members') {
      const { data: members } = await auth.supabase
        .from('profiles')
        .select('id, full_name, email, role, is_admin, is_hto')
        .eq('is_active', true)
        .order('full_name', { ascending: true });
      payload.members = members || [];
    }

    return NextResponse.json(payload);
  } catch (e) {
    return handleRouteError('GET /support-calls', e);
  }
}

function requiredForSubmit(v: Record<string, unknown>, description: string, clientName: string | null) {
  const missing: string[] = [];
  if (!description) missing.push('Issue description');
  if (!clientName) missing.push('Client');
  if (!v.report_method) missing.push('Reporting method');
  if (!v.reported_at) missing.push('Date/time received');
  if (!v.estate_or_building) missing.push('Estate / Building');
  if (!v.reporter_contact) missing.push('Reporter Contact (email or telephone)');
  if (!missing.length) return null;
  return (
    'Support Call cannot be submitted. The following information is still required:\n- ' +
    missing.join('\n- ')
  );
}

/** POST /api/support-calls — managers only. as_draft=true skips ticket creation. */
export async function POST(request: NextRequest) {
  let createdTicketId: string | null = null;
  let svc: SupabaseClient | null = null;
  try {
    const a = await authenticateManager(request);
    if (!a.ok) return a.response;
    const { auth } = a;
    const supabase = auth.supabase;
    svc = supabase;
    const body = await readJson(request);
    const asDraft = body.as_draft === true;

    const description = cleanStr(body.original_description, 20000);
    if (!description && !asDraft) return jsonError('original_description is required', 400);
    if (!description && asDraft) {
      // drafts still need something to identify the call
      if (!cleanStr(body.client, 200) && !cleanStr(body.reporter_organisation, 200)) {
        return jsonError('Provide at least a client or description to save a draft', 400);
      }
    }

    const parsed = parseIntake(body);
    if (parsed.error) return jsonError(parsed.error, 400);
    const v = parsed.values;
    if (!asDraft) {
      const contactErr = applyReporterContact(v, body, { require: true });
      if (contactErr) return jsonError(contactErr, 400);
    } else {
      applyReporterContact(v, body);
    }
    const priority = parsePriority(body.priority, 'Medium');
    const clientName =
      (v.client as string | null) ||
      cleanStr(body.client, 200) ||
      null;

    if (!asDraft) {
      const reqErr = requiredForSubmit(
        { ...v, reported_at: (v.reported_at as string | null) ?? cleanStr(body.reported_at, 40) },
        description || '',
        clientName
      );
      if (reqErr) return jsonError(reqErr, 400);
    }

    let htoOwnerId: string | null = null;
    if (isUuid(body.hto_owner_id)) htoOwnerId = body.hto_owner_id;
    else if (auth.isHto) htoOwnerId = auth.userId;
    if (!htoOwnerId) return jsonError('Select an HTO owner (hto_owner_id)', 400);
    const owners = await loadProfilesById(supabase, [htoOwnerId]);
    const owner = owners[htoOwnerId];
    if (!owner || owner.is_active === false || !owner.is_hto) {
      return jsonError('hto_owner_id must be an active HTO', 400);
    }

    const dup = await findDuplicateSupportCalls(supabase, {
      supplier_invoice_number: v.supplier_invoice_number as string | null,
      third_party_job_card_number: v.third_party_job_card_number as string | null,
      po_number: v.po_number as string | null,
      external_quote_reference: v.external_quote_reference as string | null,
      client: clientName,
      site_name: (v.site_name as string | null) || (v.onsite_location as string | null),
    });
    const ackReason = cleanStr(body.duplicate_ack_reason, 1000);
    if (!asDraft && dup.exactMatch) {
      return jsonError(dup.safeHint || 'Duplicate reference', 409, { code: 'DUPLICATE', duplicates: dup });
    }
    if (!asDraft && dup.hasPossibleDuplicate && !ackReason) {
      return jsonError(dup.safeHint || 'Possible duplicate', 409, {
        code: 'POSSIBLE_DUPLICATE',
        requires_ack: true,
        duplicates: dup,
      });
    }

    const location = (v.location as 'on-site' | 'remote' | null) ?? 'on-site';
    const onsite = (v.onsite_location as string | null) || (v.site_name as string | null) || null;

    let ticket: { id: string; ticket_number: string } | null = null;
    if (!asDraft) {
      ticket = await createPendingTicket(supabase, {
        hto_owner_id: htoOwnerId,
        created_by: auth.userId,
        client: clientName!,
        location,
        issue: description!,
        severity: priorityToSeverity(priority),
        estate_or_building: v.estate_or_building as string | null,
        cml_location: v.cml_location as string | null,
        onsite_location: onsite,
        client_email: (v.reporter_email as string | null) ?? (v.reporter_contact as string | null),
      });
      createdTicketId = ticket.id;
    }

    let sc: Record<string, unknown> | null = null;
    let lastErr: { message: string; code?: string } | null = null;
    for (let attempt = 0; attempt < 5 && !sc; attempt++) {
      const support_call_number = await nextSupportCallNumber(supabase);
      const insertRow: Record<string, unknown> = {
        ...v,
        client: clientName,
        site_name: onsite || (v.site_name as string | null),
        onsite_location: onsite,
        location: (v.location as string | null) ?? location,
        support_call_number,
        ticket_id: ticket?.id ?? null,
        hto_owner_id: htoOwnerId,
        created_by: auth.userId,
        priority,
        overall_status: asDraft ? 'draft' : 'open',
        workflow_stage: asDraft ? 'logged' : 'awaiting_assignment',
        original_description: description || '(draft)',
        reported_at: (v.reported_at as string | null) ?? (asDraft ? null : new Date().toISOString()),
        report_method: (v.report_method as string | null) || cleanStr(body.report_method, 100),
      };
      const { data, error } = await supabase.from('support_calls').insert(insertRow).select('*').single();
      if (!error && data) {
        sc = data as Record<string, unknown>;
      } else {
        lastErr = error;
        if (error?.code !== '23505' || !error.message.includes('support_call_number')) break;
      }
    }
    if (!sc) {
      if (ticket) {
        await supabase.from('tickets').delete().eq('id', ticket.id);
        createdTicketId = null;
      }
      return dbError('create', lastErr || { message: 'Insert failed' });
    }
    createdTicketId = null;

    const scId = sc.id as string;

    await writeSupportCallAudit(supabase, {
      support_call_id: scId,
      ticket_id: ticket?.id ?? null,
      actor_id: auth.userId,
      actor_role: actorRole(auth),
      event_type: asDraft ? 'support_call_draft_created' : 'support_call_created',
      new_value: {
        support_call_number: sc.support_call_number,
        ticket_number: ticket?.ticket_number ?? null,
        ticket_status: ticket ? 'pending' : null,
        hto_owner_id: htoOwnerId,
        priority,
        overall_status: sc.overall_status,
      },
      source: 'api',
    });

    if (!asDraft && dup.hasPossibleDuplicate && ackReason) {
      await supabase.from('support_call_duplicate_decisions').insert({
        support_call_id: scId,
        actor_id: auth.userId,
        reason: ackReason,
        match_criteria: { matched_fields: dup.matches.map((m) => m.matched_fields) },
        matched_support_call_ids: dup.matches.map((m) => m.id),
      });
      await writeSupportCallAudit(supabase, {
        support_call_id: scId,
        ticket_id: ticket!.id,
        actor_id: auth.userId,
        actor_role: actorRole(auth),
        event_type: 'duplicate_acknowledged',
        new_value: { matches: dup.matches },
        reason: ackReason,
        source: 'api',
      });
    }

    let assignResult: unknown = null;
    const memberIds = Array.isArray(body.member_ids) ? (body.member_ids as unknown[]).filter(isUuid) : [];
    if (!asDraft && ticket && memberIds.length) {
      if (!onsite) {
        assignResult = { error: 'On-site location is required before dispatch' };
      } else {
        const res = await syncAssignments(
          supabase,
          { id: scId, ticket_id: ticket.id, hto_owner_id: htoOwnerId },
          memberIds,
          isUuid(body.lead_id) ? body.lead_id : null,
          auth.userId
        );
        if (res.ok) {
          assignResult = { added: res.added, lead_id: res.lead_id };
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
          assignResult = { error: res.error };
        }
      }
    }

    const stage = asDraft ? null : await recomputeWorkflowStage(supabase, scId);

    return NextResponse.json(
      {
        support_call: { ...sc, workflow_stage: stage?.stage ?? sc.workflow_stage },
        ticket: ticket ? { id: ticket.id, ticket_number: ticket.ticket_number, status: 'pending' } : null,
        assignment: assignResult,
      },
      { status: 201 }
    );
  } catch (e) {
    if (createdTicketId && svc) {
      try {
        await svc.from('tickets').delete().eq('id', createdTicketId);
      } catch {
        /* ignore */
      }
    }
    return handleRouteError('POST /support-calls', e);
  }
}
