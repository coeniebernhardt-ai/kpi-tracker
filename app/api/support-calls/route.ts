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
import { parseIntake } from '@/app/lib/support-calls/intake';
import { findDuplicateSupportCalls } from '@/app/lib/support-calls/duplicates';
import { nextSupportCallNumber } from '@/app/lib/support-calls/numbers';
import { writeSupportCallAudit } from '@/app/lib/support-calls/audit';
import { notifySupportCallUsers } from '@/app/lib/support-calls/notify';

/**
 * GET /api/support-calls
 * Managers see everything; members only calls they are assigned to.
 * Query: status=open|closed|cancelled|all, stage, priority, q, include=members, limit
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
        'id, support_call_number, ticket_id, hto_owner_id, priority, overall_status, workflow_stage, client, site_name, location, original_description, reporter_name, reported_at, initial_notification_status, eta_notification_status, created_at, updated_at, closed_at, cancelled_at'
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
    const rows = (calls || []) as Array<Record<string, unknown> & { id: string; ticket_id: string; hto_owner_id: string }>;

    const ids = rows.map((r) => r.id);
    const [assignRes, ticketRes] = await Promise.all([
      ids.length
        ? auth.supabase
            .from('support_call_assignments')
            .select('support_call_id, member_id, is_lead, acknowledged_at, started_work_at')
            .in('support_call_id', ids)
        : Promise.resolve({ data: [] }),
      rows.length
        ? auth.supabase
            .from('tickets')
            .select('id, ticket_number, status')
            .in('id', rows.map((r) => r.ticket_id))
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
      ticket: ticketMap.get(r.ticket_id) ?? null,
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

/** POST /api/support-calls — managers only. Creates a PENDING ticket assigned to the HTO + the support call. */
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

    const description = cleanStr(body.original_description, 20000);
    if (!description) return jsonError('original_description is required', 400);

    const parsed = parseIntake(body);
    if (parsed.error) return jsonError(parsed.error, 400);
    const v = parsed.values;
    const priority = parsePriority(body.priority, 'Medium');
    const clientName = (v.client as string | null) || (v.reporter_organisation as string | null) || null;
    if (!clientName) return jsonError('client (or reporter_organisation) is required', 400);

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

    // Duplicate guard (exact refs block; same client/site/day needs acknowledgement)
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

    const location = (v.location as 'on-site' | 'remote' | null) ?? 'remote';
    const ticket = await createPendingTicket(supabase, {
      hto_owner_id: htoOwnerId,
      created_by: auth.userId,
      client: clientName,
      location,
      issue: description,
      severity: priorityToSeverity(priority),
      estate_or_building: v.estate_or_building as string | null,
      cml_location: v.cml_location as string | null,
      client_email: (v.reporter_email as string | null) ?? null,
    });
    createdTicketId = ticket.id;

    // Insert the support call (retry on daily-number collision)
    let sc: Record<string, unknown> | null = null;
    let lastErr: { message: string; code?: string } | null = null;
    for (let attempt = 0; attempt < 5 && !sc; attempt++) {
      const support_call_number = await nextSupportCallNumber(supabase);
      const { data, error } = await supabase
        .from('support_calls')
        .insert({
          ...v,
          client: clientName,
          location: (v.location as string | null) ?? location,
          support_call_number,
          ticket_id: ticket.id,
          hto_owner_id: htoOwnerId,
          created_by: auth.userId,
          priority,
          overall_status: 'open',
          workflow_stage: 'awaiting_assignment',
          original_description: description,
          reported_at: (v.reported_at as string | null) ?? new Date().toISOString(),
        })
        .select('*')
        .single();
      if (!error && data) {
        sc = data as Record<string, unknown>;
      } else {
        lastErr = error;
        if (error?.code !== '23505' || !error.message.includes('support_call_number')) break;
      }
    }
    if (!sc) {
      await supabase.from('tickets').delete().eq('id', ticket.id);
      createdTicketId = null;
      return dbError('create', lastErr || { message: 'Insert failed' });
    }
    createdTicketId = null; // committed

    const scId = sc.id as string;

    await writeSupportCallAudit(supabase, {
      support_call_id: scId,
      ticket_id: ticket.id,
      actor_id: auth.userId,
      actor_role: actorRole(auth),
      event_type: 'support_call_created',
      new_value: {
        support_call_number: sc.support_call_number,
        ticket_number: ticket.ticket_number,
        ticket_status: 'pending',
        hto_owner_id: htoOwnerId,
        priority,
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

    // Optional immediate assignment
    let assignResult: unknown = null;
    const memberIds = Array.isArray(body.member_ids) ? (body.member_ids as unknown[]).filter(isUuid) : [];
    if (memberIds.length) {
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

    const stage = await recomputeWorkflowStage(supabase, scId);

    return NextResponse.json(
      {
        support_call: { ...sc, workflow_stage: stage?.stage ?? sc.workflow_stage },
        ticket: { id: ticket.id, ticket_number: ticket.ticket_number, status: 'pending' },
        assignment: assignResult,
      },
      { status: 201 }
    );
  } catch (e) {
    if (createdTicketId && svc) {
      try {
        await svc.from('tickets').delete().eq('id', createdTicketId);
      } catch {
        /* ignore rollback failure */
      }
    }
    return handleRouteError('POST /support-calls', e);
  }
}
