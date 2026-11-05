'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { scFetch, type ScFetchError } from '../../lib/support-calls/client';
import {
  Badge,
  Field,
  Notice,
  StageBadge,
  btnGhost,
  btnPrimary,
  errorMessage,
  fmtDateTime,
  fromLocalInput,
  inputCls,
  nowLocalInput,
  priorityTone,
  textareaCls,
} from '../../components/support-calls/sc-ui';
import { AdminPanel, EmptyState } from '../admin-ui';
import LocationCascade, { emptyLocationSelection, type LocationSelection } from '../../components/support-calls/LocationCascade';

type ListAssignment = { member_id: string; full_name: string | null; is_lead: boolean };
type ListRow = {
  id: string;
  support_call_number: string;
  priority: string;
  overall_status: 'draft' | 'open' | 'closed' | 'cancelled';
  workflow_stage: string;
  client: string | null;
  site_name: string | null;
  location: string | null;
  original_description: string;
  reporter_name: string | null;
  initial_notification_status: string;
  eta_notification_status: string;
  created_at: string;
  hto_owner_name: string | null;
  ticket: { ticket_number: string; status: string } | null;
  assignments: ListAssignment[];
};
type Member = { id: string; full_name: string | null; email: string | null; role?: string | null; is_hto?: boolean; is_admin?: boolean };
type DupMatch = { id: string; support_call_number: string; matched_fields: string[] };
type DupResult = { hasPossibleDuplicate: boolean; exactMatch: boolean; safeHint: string | null; matches: DupMatch[] };

const QUEUES: { key: string; label: string; match: (r: ListRow) => boolean }[] = [
  { key: 'draft', label: 'Drafts', match: (r) => r.overall_status === 'draft' },
  { key: 'open', label: 'All open', match: (r) => r.overall_status === 'open' },
  { key: 'assign', label: 'Needs assignment', match: (r) => r.overall_status === 'open' && ['awaiting_assignment', 'awaiting_acknowledgement'].includes(r.workflow_stage) },
  { key: 'progress', label: 'In progress', match: (r) => r.overall_status === 'open' && ['in_progress', 'awaiting_dependency', 'awaiting_quote_decision'].includes(r.workflow_stage) },
  { key: 'contrib', label: 'Technical work', match: (r) => r.overall_status === 'open' && ['contributions_pending', 'contributions_in_review', 'technical_pending', 'technical_in_review'].includes(r.workflow_stage) },
  { key: 'signoff', label: 'Job card & signature', match: (r) => r.overall_status === 'open' && ['job_card_pending', 'awaiting_signature'].includes(r.workflow_stage) },
  { key: 'finance', label: 'Ready for finance', match: (r) => r.overall_status === 'open' && r.workflow_stage === 'ready_for_finance' },
  { key: 'closed', label: 'Closed', match: (r) => r.overall_status === 'closed' },
  { key: 'cancelled', label: 'Cancelled', match: (r) => r.overall_status === 'cancelled' },
];

const REPORT_METHODS = ['Email', 'Telephone', 'WhatsApp', 'In person', 'Other'];

const emptyForm = () => ({
  report_method: 'Telephone',
  reporter_name: '',
  reporter_organisation: '',
  reporter_email: '',
  reporter_phone: '',
  reported_at: nowLocalInput(),
  original_description: '',
  priority: 'Medium',
  location: 'on-site',
  responsible_name: '',
  responsible_position: '',
  responsible_organisation: '',
  responsible_email: '',
  responsible_phone: '',
  supplier_invoice_number: '',
  third_party_job_card_number: '',
  po_number: '',
  external_quote_reference: '',
});

export default function SupportCallsPage() {
  const router = useRouter();
  const { session, user, isHto, canManageSupportCalls } = useAuth();
  const token = session?.access_token ?? null;

  const [rows, setRows] = useState<ListRow[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState('open');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loc, setLoc] = useState<LocationSelection>(emptyLocationSelection);
  const [htoId, setHtoId] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [leadId, setLeadId] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [dup, setDup] = useState<DupResult | null>(null);
  const [ackReason, setAckReason] = useState('');
  const [checking, setChecking] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await scFetch('/api/support-calls?include=members&limit=500', { accessToken: token });
      setRows(data.support_calls || []);
      setMembers(data.members || []);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const htos = useMemo(() => members.filter((m) => m.is_hto), [members]);
  const effectiveHto = isHto && !htoId ? user?.id ?? '' : htoId;

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const q of QUEUES) out[q.key] = rows.filter(q.match).length;
    return out;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = QUEUES.find((x) => x.key === queue) ?? QUEUES[0];
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (!q.match(r)) return false;
      if (priorityFilter && r.priority !== priorityFilter) return false;
      if (!term) return true;
      return [r.support_call_number, r.client, r.site_name, r.reporter_name, r.original_description, r.ticket?.ticket_number]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [rows, queue, search, priorityFilter]);

  const set = (k: keyof ReturnType<typeof emptyForm>, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const toggleMember = (id: string) => {
    const next = memberIds.includes(id) ? memberIds.filter((x) => x !== id) : [...memberIds, id];
    setMemberIds(next);
    if (!next.includes(leadId)) setLeadId(next[0] ?? '');
  };

  const payload = (asDraft: boolean) => ({
    ...form,
    ...loc,
    client: loc.client || form.reporter_organisation,
    site_name: loc.onsite_location || loc.site_name,
    reported_at: fromLocalInput(form.reported_at),
    hto_owner_id: effectiveHto || undefined,
    member_ids: asDraft ? [] : memberIds,
    lead_id: asDraft ? undefined : leadId || memberIds[0] || undefined,
    duplicate_ack_reason: ackReason.trim() || undefined,
    as_draft: asDraft,
  });

  const checkDuplicates = async () => {
    setChecking(true);
    setCreateError(null);
    try {
      const res = (await scFetch('/api/support-calls/check-duplicates', {
        method: 'POST',
        accessToken: token,
        body: JSON.stringify({
          supplier_invoice_number: form.supplier_invoice_number,
          third_party_job_card_number: form.third_party_job_card_number,
          po_number: form.po_number,
          external_quote_reference: form.external_quote_reference,
          client: loc.client || form.reporter_organisation,
          site_name: loc.onsite_location || loc.site_name,
        }),
      })) as DupResult;
      setDup(res.hasPossibleDuplicate ? res : null);
      if (!res.hasPossibleDuplicate) setCreateError(null);
    } catch (e) {
      setCreateError(errorMessage(e));
    } finally {
      setChecking(false);
    }
  };

  const create = async (asDraft: boolean) => {
    setCreating(true);
    setCreateError(null);
    try {
      const res = await scFetch('/api/support-calls', {
        method: 'POST',
        accessToken: token,
        body: JSON.stringify(payload(asDraft)),
      });
      router.push(`/admin/support-calls/${res.support_call.id}`);
    } catch (e) {
      const err = e as ScFetchError;
      const data = err.data as { duplicates?: DupResult } | undefined;
      if (data?.duplicates) setDup(data.duplicates);
      setCreateError(errorMessage(e));
    } finally {
      setCreating(false);
    }
  };

  const needsAck = Boolean(dup?.hasPossibleDuplicate && !dup.exactMatch);
  const canSubmit =
    form.original_description.trim() &&
    form.report_method.trim() &&
    form.reported_at.trim() &&
    loc.client.trim() &&
    loc.estate_or_building.trim() &&
    effectiveHto &&
    !dup?.exactMatch &&
    (!needsAck || ackReason.trim());
  const canDraft =
    effectiveHto && (form.original_description.trim() || loc.client.trim() || form.reporter_organisation.trim());

  if (!canManageSupportCalls) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-8">
        <EmptyState title="Support calls" description="Only admins and HTOs can manage support calls. Technicians work from their dashboard tickets." />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <section className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">Support Calls</h1>
          <p className="mt-2 text-sm text-slate-400">
            HTO-owned operational calls — assignment, technical work, job cards, signing and finance handover.
          </p>
        </div>
        <button type="button" className={btnPrimary} onClick={() => setShowCreate((s) => !s)}>
          {showCreate ? 'Close form' : '+ New support call'}
        </button>
      </section>

      {showCreate && (
        <div className="mb-6">
          <AdminPanel title="New support call" accent="strong">
            <p className="mb-4 text-xs text-slate-400">
              Save a <span className="text-amber-300">Draft</span> without a ticket, or submit to create a{' '}
              <span className="text-amber-300">Pending</span> ticket owned by the HTO.
            </p>
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-4">
                <Field label="Reported via">
                  <select className={inputCls} value={form.report_method} onChange={(e) => set('report_method', e.target.value)}>
                    {REPORT_METHODS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </Field>
                <Field label="Reported at">
                  <input type="datetime-local" className={inputCls} value={form.reported_at} onChange={(e) => set('reported_at', e.target.value)} />
                </Field>
                <Field label="Priority">
                  <select className={inputCls} value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                    {['Critical', 'High', 'Medium', 'Low'].map((p) => <option key={p}>{p}</option>)}
                  </select>
                </Field>
                <Field label="HTO owner">
                  <select className={inputCls} value={effectiveHto} onChange={(e) => setHtoId(e.target.value)}>
                    <option value="">Select HTO…</option>
                    {htos.map((h) => <option key={h.id} value={h.id}>{h.full_name}</option>)}
                  </select>
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <Field label="Reporter name"><input className={inputCls} value={form.reporter_name} onChange={(e) => set('reporter_name', e.target.value)} /></Field>
                <Field label="Reporter organisation"><input className={inputCls} value={form.reporter_organisation} onChange={(e) => set('reporter_organisation', e.target.value)} /></Field>
                <Field label="Reporter email"><input type="email" className={inputCls} value={form.reporter_email} onChange={(e) => set('reporter_email', e.target.value)} /></Field>
                <Field label="Reporter phone"><input className={inputCls} value={form.reporter_phone} onChange={(e) => set('reporter_phone', e.target.value)} /></Field>
              </div>

              <Field label="Problem reported (stays unchanged after creation)">
                <textarea className={textareaCls} value={form.original_description} onChange={(e) => set('original_description', e.target.value)} />
              </Field>

              <LocationCascade token={token} value={loc} onChange={setLoc} requireOnsite={false} />
              <Field label="Work type">
                <select className={inputCls} value={form.location} onChange={(e) => set('location', e.target.value)}>
                  <option value="on-site">On-site</option>
                  <option value="remote">Remote</option>
                </select>
              </Field>

              <div className="grid gap-3 md:grid-cols-5">
                <Field label="Responsible person"><input className={inputCls} value={form.responsible_name} onChange={(e) => set('responsible_name', e.target.value)} /></Field>
                <Field label="Position"><input className={inputCls} value={form.responsible_position} onChange={(e) => set('responsible_position', e.target.value)} /></Field>
                <Field label="Organisation"><input className={inputCls} value={form.responsible_organisation} onChange={(e) => set('responsible_organisation', e.target.value)} /></Field>
                <Field label="Email"><input type="email" className={inputCls} value={form.responsible_email} onChange={(e) => set('responsible_email', e.target.value)} /></Field>
                <Field label="Phone"><input className={inputCls} value={form.responsible_phone} onChange={(e) => set('responsible_phone', e.target.value)} /></Field>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.14em] text-slate-500">External references (optional)</span>
                  <button type="button" className={btnGhost} onClick={() => void checkDuplicates()} disabled={checking}>
                    {checking ? 'Checking…' : 'Check for duplicates'}
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <Field label="Supplier invoice #"><input className={inputCls} value={form.supplier_invoice_number} onChange={(e) => set('supplier_invoice_number', e.target.value)} /></Field>
                  <Field label="Third-party job card #"><input className={inputCls} value={form.third_party_job_card_number} onChange={(e) => set('third_party_job_card_number', e.target.value)} /></Field>
                  <Field label="PO #"><input className={inputCls} value={form.po_number} onChange={(e) => set('po_number', e.target.value)} /></Field>
                  <Field label="External quote ref"><input className={inputCls} value={form.external_quote_reference} onChange={(e) => set('external_quote_reference', e.target.value)} /></Field>
                </div>
              </div>

              {dup?.hasPossibleDuplicate && (
                <div className="space-y-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3">
                  <p className="text-sm text-amber-200">{dup.safeHint}</p>
                  <ul className="text-xs text-slate-300">
                    {dup.matches.map((m) => (
                      <li key={m.id}>
                        <Link href={`/admin/support-calls/${m.id}`} className="text-cyan-300 hover:underline">{m.support_call_number}</Link>{' '}
                        — {m.matched_fields.join(', ')}
                      </li>
                    ))}
                  </ul>
                  {dup.exactMatch ? (
                    <p className="text-xs text-rose-300">Exact reference matches cannot be duplicated. Change the reference or open the existing call.</p>
                  ) : (
                    <Field label="This is not a duplicate because…">
                      <input className={inputCls} value={ackReason} onChange={(e) => setAckReason(e.target.value)} />
                    </Field>
                  )}
                </div>
              )}

              <div>
                <span className="mb-2 block text-xs uppercase tracking-[0.14em] text-slate-500">Assign team members (optional — can be done later)</span>
                <div className="grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                  {members.map((m) => {
                    const on = memberIds.includes(m.id);
                    return (
                      <div key={m.id} className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${on ? 'border-cyan-500/40 bg-cyan-500/10' : 'border-slate-800 bg-slate-950/60'}`}>
                        <label className="flex min-w-0 flex-1 items-center gap-2 text-slate-200">
                          <input type="checkbox" checked={on} onChange={() => toggleMember(m.id)} />
                          <span className="truncate">{m.full_name}</span>
                          {m.is_hto && <Badge tone="cyan">HTO</Badge>}
                        </label>
                        {on && (
                          <label className="flex items-center gap-1 text-[11px] text-slate-400">
                            <input type="radio" name="lead" checked={leadId === m.id} onChange={() => setLeadId(m.id)} /> lead
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {createError && <Notice tone="error">{createError}</Notice>}

              <div className="flex flex-wrap gap-3">
                <button type="button" className={btnGhost} disabled={creating || !canDraft} onClick={() => void create(true)}>
                  {creating ? 'Saving…' : 'Save draft'}
                </button>
                <button type="button" className={btnPrimary} disabled={creating || !canSubmit} onClick={() => void create(false)}>
                  {creating ? 'Creating…' : 'Submit support call'}
                </button>
                <button type="button" className={btnGhost} onClick={() => { setForm(emptyForm()); setLoc(emptyLocationSelection()); setDup(null); setAckReason(''); setMemberIds([]); setCreateError(null); }}>
                  Reset
                </button>
              </div>
            </div>
          </AdminPanel>
        </div>
      )}

      <section className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUEUES.map((q) => (
          <button
            key={q.key}
            type="button"
            onClick={() => setQueue(q.key)}
            className={`rounded-2xl border p-4 text-left transition ${
              queue === q.key ? 'border-cyan-500/40 bg-cyan-500/10' : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
            }`}
          >
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{q.label}</p>
            <p className={`mt-2 text-2xl font-semibold ${queue === q.key ? 'text-cyan-200' : 'text-white'}`}>{counts[q.key] ?? 0}</p>
          </button>
        ))}
      </section>

      <AdminPanel
        title={QUEUES.find((q) => q.key === queue)?.label ?? 'Support calls'}
        action={<button type="button" className={btnGhost} onClick={() => void load()}>Refresh</button>}
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_180px]">
          <input className={inputCls} placeholder="Search number, client, site, reporter, ticket…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className={inputCls} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="">All priorities</option>
            {['Critical', 'High', 'Medium', 'Low'].map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>

        {error && <div className="mb-3"><Notice tone="error">{error}</Notice></div>}

        {loading ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/70 px-4 py-10 text-center text-slate-400">Loading support calls…</div>
        ) : filtered.length === 0 ? (
          <EmptyState title="Nothing in this queue" description="Adjust the filters or pick another queue." />
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <Link
                key={r.id}
                href={`/admin/support-calls/${r.id}`}
                className="block rounded-3xl border border-slate-800 bg-slate-950/70 p-4 transition hover:border-cyan-500/30"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-white">{r.support_call_number}</span>
                    <Badge tone={priorityTone(r.priority)}>{r.priority}</Badge>
                    <StageBadge stage={r.workflow_stage} />
                    {r.ticket && <Badge tone={r.ticket.status === 'pending' ? 'amber' : 'slate'}>Ticket {r.ticket.ticket_number} · {r.ticket.status}</Badge>}
                  </div>
                  <span className="text-xs text-slate-500">{fmtDateTime(r.created_at)}</span>
                </div>
                <p className="mt-2 text-sm text-slate-300">{[r.client, r.site_name].filter(Boolean).join(' · ') || '—'}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{r.original_description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span>HTO: {r.hto_owner_name ?? '—'}</span>
                  <span>·</span>
                  <span>
                    Team:{' '}
                    {r.assignments.length
                      ? r.assignments.map((a) => `${a.full_name ?? 'Unknown'}${a.is_lead ? ' (lead)' : ''}`).join(', ')
                      : 'unassigned'}
                  </span>
                  {r.initial_notification_status !== 'complete' && r.overall_status === 'open' && (
                    <Badge tone="amber">Initial notice {r.initial_notification_status}</Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </AdminPanel>
    </main>
  );
}
