import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireSupportCallUser, type SupportCallAuth } from './auth';
import { writeSupportCallAudit } from './audit';
import { resolveWorkflowStage, type WorkflowFlags } from './progress';
import { getSafeErrorMessage, logSafeError } from '../safe-api-error';
import type { SupportCall, SupportCallAssignment, SupportCallPriority } from './types';

export type AuthOk = Extract<SupportCallAuth, { ok: true }>;

export type RouteCtx<P extends Record<string, string> = { id: string }> = {
  params: Promise<P>;
};

/* -------------------------------------------------------------------------- */
/* Responses & errors                                                         */
/* -------------------------------------------------------------------------- */

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...(extra || {}) }, { status });
}

export function handleRouteError(context: string, err: unknown) {
  logSafeError(`[support-calls] ${context}`, err);
  return NextResponse.json({ error: getSafeErrorMessage(err) }, { status: 500 });
}

/** Translate a Postgres unique violation to a friendly 409, otherwise 500. */
export function dbError(context: string, error: { message: string; code?: string }) {
  if (error.code === '23505') {
    return jsonError('A record with the same unique value already exists (possible duplicate).', 409, {
      code: 'DUPLICATE',
    });
  }
  if (error.code === '23503') {
    return jsonError('A referenced record does not exist.', 400, { code: 'FK_VIOLATION' });
  }
  if (error.code === '23514') {
    return jsonError('A value is not allowed for one of the fields.', 400, { code: 'CHECK_VIOLATION' });
  }
  logSafeError(`[support-calls] ${context}`, new Error(error.message));
  return NextResponse.json({ error: getSafeErrorMessage(new Error(error.message)) }, { status: 500 });
}

/* -------------------------------------------------------------------------- */
/* Input helpers                                                              */
/* -------------------------------------------------------------------------- */

export function cleanStr(v: unknown, max = 5000): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

export function cleanNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function cleanIso(v: unknown): string | null {
  if (typeof v !== 'string' || !v.trim()) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function cleanDate(v: unknown): string | null {
  if (typeof v !== 'string' || !v.trim()) return null;
  const m = v.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

export function isUuid(v: unknown): v is string {
  return (
    typeof v === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
  );
}

export async function readJson<T = Record<string, unknown>>(request: NextRequest): Promise<T> {
  try {
    const body = await request.json();
    return (body && typeof body === 'object' ? body : {}) as T;
  } catch {
    return {} as T;
  }
}

/* -------------------------------------------------------------------------- */
/* Priority <-> ticket severity                                               */
/* -------------------------------------------------------------------------- */

const PRIORITIES: SupportCallPriority[] = ['Critical', 'High', 'Medium', 'Low'];

export function parsePriority(v: unknown, fallback: SupportCallPriority = 'Medium'): SupportCallPriority {
  if (typeof v !== 'string') return fallback;
  const found = PRIORITIES.find((p) => p.toLowerCase() === v.trim().toLowerCase());
  return found ?? fallback;
}

export function priorityToSeverity(p: SupportCallPriority): 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW' {
  switch (p) {
    case 'Critical':
      return 'URGENT';
    case 'High':
      return 'HIGH';
    case 'Low':
      return 'LOW';
    default:
      return 'MEDIUM';
  }
}

export function severityToPriority(s: string | null | undefined): SupportCallPriority {
  switch ((s || '').toUpperCase()) {
    case 'URGENT':
    case 'CRITICAL':
      return 'Critical';
    case 'HIGH':
      return 'High';
    case 'LOW':
      return 'Low';
    default:
      return 'Medium';
  }
}

/* -------------------------------------------------------------------------- */
/* Auth / context                                                             */
/* -------------------------------------------------------------------------- */

export type GuardFail = { ok: false; response: NextResponse };

export async function authenticate(
  request: NextRequest
): Promise<{ ok: true; auth: AuthOk } | GuardFail> {
  const auth = await requireSupportCallUser(request);
  if (!auth.ok) return { ok: false, response: jsonError(auth.error, auth.status) };
  return { ok: true, auth };
}

export async function authenticateManager(
  request: NextRequest
): Promise<{ ok: true; auth: AuthOk } | GuardFail> {
  const res = await authenticate(request);
  if (!res.ok) return res;
  if (!res.auth.canManage) {
    return { ok: false, response: jsonError('Only admins and HTOs can perform this action', 403) };
  }
  return res;
}

export function actorRole(auth: AuthOk): 'admin' | 'hto' | 'member' {
  if (auth.isAdmin) return 'admin';
  if (auth.isHto) return 'hto';
  return 'member';
}

/** Notifications table only accepts 'admin' | 'member'. */
export function notifyRole(auth: AuthOk): 'admin' | 'member' {
  return auth.canManage ? 'admin' : 'member';
}

export async function loadSupportCall(
  supabase: SupabaseClient,
  id: string
): Promise<SupportCall | null> {
  if (!isUuid(id)) return null;
  const { data } = await supabase.from('support_calls').select('*').eq('id', id).maybeSingle();
  return (data as SupportCall | null) ?? null;
}

export async function getAssignment(
  supabase: SupabaseClient,
  scId: string,
  userId: string
): Promise<SupportCallAssignment | null> {
  const { data } = await supabase
    .from('support_call_assignments')
    .select('*')
    .eq('support_call_id', scId)
    .eq('member_id', userId)
    .maybeSingle();
  return (data as SupportCallAssignment | null) ?? null;
}

export type ScContext = {
  ok: true;
  auth: AuthOk;
  sc: SupportCall;
  assignment: SupportCallAssignment | null;
  audit: (
    event_type: string,
    extra?: {
      previous_value?: unknown;
      new_value?: unknown;
      reason?: string | null;
      related_id?: string | null;
      source?: string | null;
    }
  ) => Promise<void>;
};

/**
 * Loads auth + support call and enforces access.
 *  - manager: admin/HTO only
 *  - manager_or_assignee: managers or assigned members
 *  - read: managers, assignees, or the HTO owner
 */
export async function scContext(
  request: NextRequest,
  id: string,
  mode: 'manager' | 'manager_or_assignee' | 'read',
  opts: { requireOpen?: boolean; allowDraft?: boolean } = {}
): Promise<ScContext | GuardFail> {
  const a = await authenticate(request);
  if (!a.ok) return a;
  const { auth } = a;

  if (mode === 'manager' && !auth.canManage) {
    return { ok: false, response: jsonError('Only admins and HTOs can perform this action', 403) };
  }

  const sc = await loadSupportCall(auth.supabase, id);
  if (!sc) return { ok: false, response: jsonError('Support call not found', 404) };

  const assignment = await getAssignment(auth.supabase, sc.id, auth.userId);

  if (mode !== 'manager' && !auth.canManage && !assignment) {
    // Do not reveal existence to unrelated members.
    return { ok: false, response: jsonError('Support call not found', 404) };
  }

  if (opts.requireOpen) {
    const okStatus =
      sc.overall_status === 'open' || (opts.allowDraft === true && sc.overall_status === 'draft');
    if (!okStatus) {
      return {
        ok: false,
        response: jsonError(`Support call is ${sc.overall_status}; no further changes allowed`, 409),
      };
    }
  }

  const audit: ScContext['audit'] = (event_type, extra = {}) =>
    writeSupportCallAudit(auth.supabase, {
      support_call_id: sc.id,
      ticket_id: sc.ticket_id,
      actor_id: auth.userId,
      actor_role: actorRole(auth),
      event_type,
      previous_value: extra.previous_value,
      new_value: extra.new_value,
      reason: extra.reason,
      related_id: extra.related_id,
      source: extra.source ?? 'api',
    });

  return { ok: true, auth, sc, assignment, audit };
}

/* -------------------------------------------------------------------------- */
/* Profiles                                                                   */
/* -------------------------------------------------------------------------- */

export type ProfileLite = {
  id: string;
  full_name: string | null;
  email: string | null;
  is_admin?: boolean;
  is_hto?: boolean;
  is_active?: boolean;
};

export async function loadProfilesById(
  supabase: SupabaseClient,
  ids: (string | null | undefined)[]
): Promise<Record<string, ProfileLite>> {
  const unique = [...new Set(ids.filter((x): x is string => Boolean(x)))];
  if (!unique.length) return {};
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, is_admin, is_hto, is_active')
    .in('id', unique);
  const map: Record<string, ProfileLite> = {};
  for (const p of (data || []) as ProfileLite[]) map[p.id] = p;
  return map;
}

/* -------------------------------------------------------------------------- */
/* Tickets                                                                    */
/* -------------------------------------------------------------------------- */

async function buildTicketNumber(
  supabase: SupabaseClient,
  ownerId: string,
  attempt: number
): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', ownerId)
    .maybeSingle();
  const initials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .filter(Boolean)
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 3) || 'XX'
    : 'XX';
  const { count } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', ownerId)
    .gte('created_at', today.toISOString().slice(0, 10));
  const seq = String((count || 0) + 1 + attempt).padStart(3, '0');
  return `${initials}-${dateStr}-${seq}`;
}

export type PendingTicketInput = {
  hto_owner_id: string;
  created_by: string;
  client: string;
  location: 'on-site' | 'remote';
  issue: string;
  severity: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  estate_or_building?: string | null;
  cml_location?: string | null;
  client_email?: string | null;
  onsite_location?: string | null;
};

/**
 * Service-role insert of a PENDING ticket owned by / assigned to the HTO.
 * Deliberately NOT the browser createTicket helper (that forces status = open).
 */
export async function createPendingTicket(
  supabase: SupabaseClient,
  input: PendingTicketInput
): Promise<{ id: string; ticket_number: string }> {
  const now = new Date().toISOString();
  let lastError: { message: string; code?: string } | null = null;

  for (let attempt = 0; attempt < 8; attempt++) {
    const ticket_number = await buildTicketNumber(supabase, input.hto_owner_id, attempt);
    const row: Record<string, unknown> = {
      ticket_number,
      user_id: input.hto_owner_id,
      assigned_to_array: [input.hto_owner_id],
      client: input.client,
      location: input.location,
      issue: input.issue,
      status: 'pending',
      severity: input.severity,
      created_by: input.created_by,
      estate_or_building: input.estate_or_building ?? null,
      cml_location: input.cml_location ?? null,
      onsite_location: input.onsite_location ?? null,
      updates: [],
      time_logs: [
        {
          minutes: 0,
          description: 'Ticket created (pending) from support call',
          timestamp: now,
          logged_by: 'System',
        },
      ],
      total_time_minutes: 0,
      installers: [],
      dependencies: [],
      site_files: [],
      attachments: [],
    };
    if (input.client_email) row.client_email = input.client_email;

    const { data, error } = await supabase.from('tickets').insert(row).select('id, ticket_number').single();
    if (!error && data) return data as { id: string; ticket_number: string };
    lastError = error;
    if (error?.code !== '23505') break;
  }
  throw new Error(lastError?.message || 'Failed to create ticket');
}

/** Keep tickets.assigned_to_array = unique([HTO owner, ...members]). */
export async function syncTicketAssignees(
  supabase: SupabaseClient,
  ticketId: string,
  htoOwnerId: string,
  memberIds: string[]
): Promise<string[]> {
  const next = [...new Set([htoOwnerId, ...memberIds])];
  const { error } = await supabase.from('tickets').update({ assigned_to_array: next }).eq('id', ticketId);
  if (error) throw new Error(error.message);
  return next;
}

/* -------------------------------------------------------------------------- */
/* Assignments                                                                */
/* -------------------------------------------------------------------------- */

export type SyncAssignmentsResult =
  | {
      ok: true;
      added: string[];
      removed: string[];
      lead_id: string | null;
      previous: { member_id: string; is_lead: boolean }[];
      next: { member_id: string; is_lead: boolean }[];
    }
  | { ok: false; status: number; error: string; extra?: Record<string, unknown> };

export async function syncAssignments(
  supabase: SupabaseClient,
  sc: Pick<SupportCall, 'id' | 'ticket_id' | 'hto_owner_id'>,
  memberIdsRaw: string[],
  leadIdRaw: string | null,
  assignedBy: string
): Promise<SyncAssignmentsResult> {
  const memberIds = [...new Set(memberIdsRaw.filter(isUuid))];
  if (!memberIds.length) {
    return { ok: false, status: 400, error: 'At least one valid member is required' };
  }
  const leadId = leadIdRaw && memberIds.includes(leadIdRaw) ? leadIdRaw : memberIds[0];
  if (leadIdRaw && !memberIds.includes(leadIdRaw)) {
    return { ok: false, status: 400, error: 'lead_id must be one of member_ids' };
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, is_active')
    .in('id', memberIds);
  const valid = new Set(((profiles || []) as { id: string; is_active: boolean }[]).filter((p) => p.is_active !== false).map((p) => p.id));
  const invalid = memberIds.filter((id) => !valid.has(id));
  if (invalid.length) {
    return { ok: false, status: 400, error: 'One or more members do not exist or are inactive', extra: { invalid } };
  }

  const { data: existingRows } = await supabase
    .from('support_call_assignments')
    .select('*')
    .eq('support_call_id', sc.id);
  const existing = (existingRows || []) as SupportCallAssignment[];
  const existingIds = existing.map((e) => e.member_id);

  const toRemove = existing.filter((e) => !memberIds.includes(e.member_id));
  if (toRemove.length) {
    // Never silently cascade-delete real work.
    const blocked: string[] = [];
    for (const row of toRemove) {
      const [{ count: visitCount }, { count: contribCount }] = await Promise.all([
        supabase.from('support_call_visits').select('*', { count: 'exact', head: true }).eq('assignment_id', row.id),
        supabase.from('support_call_contributions').select('*', { count: 'exact', head: true }).eq('assignment_id', row.id),
      ]);
      if (row.started_work_at || row.first_update_at || (visitCount || 0) > 0 || (contribCount || 0) > 0) {
        blocked.push(row.member_id);
      }
    }
    if (blocked.length) {
      return {
        ok: false,
        status: 409,
        error: 'Cannot remove assignees who have started work, logged visits or submitted contributions',
        extra: { blocked },
      };
    }
    const { error } = await supabase
      .from('support_call_assignments')
      .delete()
      .in('id', toRemove.map((r) => r.id));
    if (error) return { ok: false, status: 500, error: error.message };
  }

  const added = memberIds.filter((id) => !existingIds.includes(id));
  if (added.length) {
    const { error } = await supabase.from('support_call_assignments').insert(
      added.map((member_id) => ({
        support_call_id: sc.id,
        member_id,
        is_lead: member_id === leadId,
        assigned_by: assignedBy,
      }))
    );
    if (error) return { ok: false, status: error.code === '23505' ? 409 : 500, error: error.message };
  }

  // Lead flags for everyone
  for (const member_id of memberIds) {
    if (!existingIds.includes(member_id)) continue;
    const wasLead = existing.find((e) => e.member_id === member_id)?.is_lead ?? false;
    const shouldBeLead = member_id === leadId;
    if (wasLead !== shouldBeLead) {
      await supabase
        .from('support_call_assignments')
        .update({ is_lead: shouldBeLead })
        .eq('support_call_id', sc.id)
        .eq('member_id', member_id);
    }
  }

  if (!sc.ticket_id) {
    return { ok: false, status: 400, error: 'Support call has no linked ticket yet — submit the draft first' };
  }
  await syncTicketAssignees(supabase, sc.ticket_id, sc.hto_owner_id, memberIds);

  return {
    ok: true,
    added,
    removed: toRemove.map((r) => r.member_id),
    lead_id: leadId,
    previous: existing.map((e) => ({ member_id: e.member_id, is_lead: e.is_lead })),
    next: memberIds.map((member_id) => ({ member_id, is_lead: member_id === leadId })),
  };
}

/* -------------------------------------------------------------------------- */
/* Workflow stage                                                             */
/* -------------------------------------------------------------------------- */

type FlagRows = {
  assignments: { id: string; acknowledged_at: string | null }[];
  visits: { visit_number: number; incomplete: boolean }[];
  quotes: { status: string }[];
  contributions: { assignment_id: string; revision: number; status: string }[];
  jobCards: { id: string; version: number; status: string }[];
  exceptions: { job_card_id: string | null }[];
  finance: { sent_confirmed: boolean }[];
};

export function computeWorkflowFlags(rows: FlagRows): WorkflowFlags {
  const latestJobCard =
    [...rows.jobCards]
      .filter((j) => j.status !== 'superseded')
      .sort((a, b) => b.version - a.version)[0] ?? null;

  const latestContribByAssignment = new Map<string, { revision: number; status: string }>();
  for (const c of rows.contributions) {
    const cur = latestContribByAssignment.get(c.assignment_id);
    if (!cur || c.revision > cur.revision) {
      latestContribByAssignment.set(c.assignment_id, { revision: c.revision, status: c.status });
    }
  }
  let contributionsOutstanding = false;
  let contributionsAwaitingReview = false;
  for (const a of rows.assignments) {
    const latest = latestContribByAssignment.get(a.id);
    if (!latest || latest.status === 'draft' || latest.status === 'returned') contributionsOutstanding = true;
    else if (latest.status === 'submitted') contributionsAwaitingReview = true;
  }

  const lastVisit = [...rows.visits].sort((a, b) => b.visit_number - a.visit_number)[0];

  return {
    hasAssignments: rows.assignments.length > 0,
    allAcknowledged: rows.assignments.length > 0 ? rows.assignments.every((a) => !!a.acknowledged_at) : undefined,
    hasVisits: rows.visits.length > 0,
    hasOpenDependency: Boolean(lastVisit?.incomplete),
    hasPendingQuote: rows.quotes.some((q) => q.status === 'pending'),
    contributionsOutstanding,
    contributionsAwaitingReview,
    hasJobCard: Boolean(latestJobCard),
    jobCardStatus: (latestJobCard?.status as WorkflowFlags['jobCardStatus']) ?? null,
    hasSignatureException: latestJobCard
      ? rows.exceptions.some((e) => e.job_card_id === latestJobCard.id)
      : false,
    financeSent: rows.finance.some((f) => f.sent_confirmed),
  };
}

export async function loadFlagRows(supabase: SupabaseClient, scId: string): Promise<FlagRows> {
  const [assignments, visits, quotes, contributions, jobCards, exceptions, finance] = await Promise.all([
    supabase.from('support_call_assignments').select('id, acknowledged_at').eq('support_call_id', scId),
    supabase.from('support_call_visits').select('visit_number, incomplete').eq('support_call_id', scId),
    supabase.from('support_call_quotes').select('status').eq('support_call_id', scId),
    supabase.from('support_call_contributions').select('assignment_id, revision, status').eq('support_call_id', scId),
    supabase.from('support_call_job_cards').select('id, version, status').eq('support_call_id', scId),
    supabase.from('support_call_signature_exceptions').select('job_card_id').eq('support_call_id', scId),
    supabase.from('support_call_finance_handovers').select('sent_confirmed').eq('support_call_id', scId),
  ]);
  return {
    assignments: (assignments.data || []) as FlagRows['assignments'],
    visits: (visits.data || []) as FlagRows['visits'],
    quotes: (quotes.data || []) as FlagRows['quotes'],
    contributions: (contributions.data || []) as FlagRows['contributions'],
    jobCards: (jobCards.data || []) as FlagRows['jobCards'],
    exceptions: (exceptions.data || []) as FlagRows['exceptions'],
    finance: (finance.data || []) as FlagRows['finance'],
  };
}

/** Recomputes and persists support_calls.workflow_stage. Never throws. */
export async function recomputeWorkflowStage(
  supabase: SupabaseClient,
  scId: string
): Promise<{ stage: string; nextAction: string } | null> {
  try {
    const { data: sc } = await supabase
      .from('support_calls')
      .select('id, overall_status, workflow_stage')
      .eq('id', scId)
      .maybeSingle();
    if (!sc) return null;
    const rows = await loadFlagRows(supabase, scId);
    const res = resolveWorkflowStage(
      { overall_status: sc.overall_status, workflow_stage: sc.workflow_stage },
      computeWorkflowFlags(rows)
    );
    if (res.stage !== sc.workflow_stage) {
      await supabase.from('support_calls').update({ workflow_stage: res.stage }).eq('id', scId);
    }
    return res;
  } catch (e) {
    logSafeError('[support-calls] recompute stage failed', e);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Bundle (detail view)                                                       */
/* -------------------------------------------------------------------------- */

export async function loadSupportCallBundle(
  supabase: SupabaseClient,
  sc: SupportCall,
  view: { manage: boolean; userId: string }
) {
  const scId = sc.id;
  const q = (table: string, order = 'created_at', ascending = true) =>
    supabase.from(table).select('*').eq('support_call_id', scId).order(order, { ascending });

  const [
    ticket,
    assignments,
    partners,
    communications,
    etaEvents,
    visits,
    hardware,
    contributions,
    quotes,
    documents,
    jobCards,
    tokens,
    signatures,
    exceptions,
    finance,
  ] = await Promise.all([
    sc.ticket_id
      ? supabase
          .from('tickets')
          .select('id, ticket_number, status, severity, issue, assigned_to_array, created_at, closed_at, resolution')
          .eq('id', sc.ticket_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    q('support_call_assignments', 'assigned_at'),
    view.manage ? q('support_call_partners', 'assigned_at') : Promise.resolve({ data: [] }),
    view.manage ? q('support_call_communications', 'communicated_at') : Promise.resolve({ data: [] }),
    q('support_call_eta_events'),
    q('support_call_visits', 'visit_number'),
    q('support_call_hardware_items'),
    q('support_call_contributions'),
    view.manage ? q('support_call_quotes') : Promise.resolve({ data: [] }),
    q('support_call_documents'),
    q('support_call_job_cards', 'version'),
    view.manage ? q('support_call_signing_tokens') : Promise.resolve({ data: [] }),
    view.manage
      ? supabase
          .from('support_call_signatures')
          .select('id, support_call_id, job_card_id, signer_name, signer_position, signer_company, confirmed, signed_at')
          .eq('support_call_id', scId)
      : Promise.resolve({ data: [] }),
    view.manage ? q('support_call_signature_exceptions') : Promise.resolve({ data: [] }),
    view.manage ? q('support_call_finance_handovers', 'version') : Promise.resolve({ data: [] }),
  ]);

  const assignmentRows = (assignments.data || []) as SupportCallAssignment[];
  const myAssignment = assignmentRows.find((a) => a.member_id === view.userId) ?? null;

  let visitRows = (visits.data || []) as Record<string, unknown>[];
  let contributionRows = (contributions.data || []) as Record<string, unknown>[];
  if (!view.manage) {
    // Members never see finance-only fields or other people's drafts.
    visitRows = visitRows.map((v) => {
      const { external_travel_cost_zar: _ext, ...rest } = v;
      void _ext;
      return rest;
    });
    contributionRows = contributionRows.filter((c) => c.assignment_id === myAssignment?.id);
  }

  const flagRows = await loadFlagRows(supabase, scId);
  const flags = computeWorkflowFlags(flagRows);
  const workflow = resolveWorkflowStage(sc, flags);

  const profiles = await loadProfilesById(supabase, [
    sc.hto_owner_id,
    sc.created_by,
    sc.closed_by,
    sc.cancelled_by,
    ...assignmentRows.map((a) => a.member_id),
    ...assignmentRows.map((a) => a.assigned_by),
    ...((communications.data || []) as { actor_id: string | null }[]).map((c) => c.actor_id),
    ...((etaEvents.data || []) as { actor_id: string | null }[]).map((c) => c.actor_id),
    ...((exceptions.data || []) as { actor_id: string | null }[]).map((c) => c.actor_id),
  ]);

  const publicProfiles: Record<string, { id: string; full_name: string | null; email: string | null }> = {};
  for (const [id, p] of Object.entries(profiles)) {
    publicProfiles[id] = { id, full_name: p.full_name, email: view.manage ? p.email : null };
  }

  const safeTokens = ((tokens.data || []) as Record<string, unknown>[]).map((t) => {
    const { token_hash: _hash, ...rest } = t;
    void _hash;
    return rest;
  });

  return {
    support_call: sc,
    ticket: ticket.data ?? null,
    assignments: assignmentRows,
    my_assignment: myAssignment,
    partners: partners.data || [],
    communications: communications.data || [],
    eta_events: etaEvents.data || [],
    visits: visitRows,
    hardware_items: hardware.data || [],
    contributions: contributionRows,
    quotes: quotes.data || [],
    documents: documents.data || [],
    job_cards: jobCards.data || [],
    signing_tokens: safeTokens,
    signatures: signatures.data || [],
    signature_exceptions: exceptions.data || [],
    finance_handovers: finance.data || [],
    profiles: publicProfiles,
    workflow: { stage: workflow.stage, next_action: workflow.nextAction },
    flags,
    can_manage: view.manage,
  };
}

/* -------------------------------------------------------------------------- */
/* Misc                                                                       */
/* -------------------------------------------------------------------------- */

export const DOCUMENTS_BUCKET = 'support-call-documents';

export function siteOrigin(request: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (env) return env.replace(/\/+$/, '');
  return request.nextUrl.origin;
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-120) || 'file';
}
