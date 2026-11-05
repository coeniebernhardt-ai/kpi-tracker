'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { scFetch } from '../../../lib/support-calls/client';
import { INTERNAL_TRAVEL_RATE_ZAR } from '../../../lib/support-calls/constants';
import { formatLabourDisplay, minutesBetween, travelAmountZar } from '../../../lib/support-calls/labour';
import type {
  SupportCall,
  SupportCallAssignment,
  SupportCallAuditEvent,
  SupportCallCommunication,
  SupportCallContribution,
  SupportCallDocument,
  SupportCallEtaEvent,
  SupportCallFinanceHandover,
  SupportCallHardwareItem,
  SupportCallJobCard,
  SupportCallPartner,
  SupportCallQuote,
  SupportCallSignature,
  SupportCallSignatureException,
  SupportCallSigningToken,
  SupportCallVisit,
  SupportPartner,
} from '../../../lib/support-calls/types';
import {
  Badge,
  Field,
  Notice,
  StageBadge,
  btnDanger,
  btnGhost,
  btnPrimary,
  errorMessage,
  fmtDate,
  fmtDateTime,
  fromLocalInput,
  inputCls,
  nowLocalInput,
  priorityTone,
  textareaCls,
} from '../../../components/support-calls/sc-ui';
import { EmptyState } from '../../admin-ui';
import LocationCascade, { emptyLocationSelection, type LocationSelection } from '../../../components/support-calls/LocationCascade';
import { useSupportCallRealtime } from '../../../lib/support-calls/useSupportCallRealtime';

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type ProfileLite = { id: string; full_name: string | null; email: string | null };
type Member = { id: string; full_name: string | null; is_hto?: boolean };

type Bundle = {
  support_call: SupportCall;
  ticket: { id: string; ticket_number: string; status: string; severity: string | null; issue: string } | null;
  assignments: SupportCallAssignment[];
  partners: SupportCallPartner[];
  communications: SupportCallCommunication[];
  eta_events: SupportCallEtaEvent[];
  visits: SupportCallVisit[];
  hardware_items: SupportCallHardwareItem[];
  contributions: SupportCallContribution[];
  quotes: SupportCallQuote[];
  documents: SupportCallDocument[];
  job_cards: SupportCallJobCard[];
  signing_tokens: Omit<SupportCallSigningToken, 'token_hash'>[];
  signatures: Omit<SupportCallSignature, 'signature_data' | 'ip_hint'>[];
  signature_exceptions: SupportCallSignatureException[];
  finance_handovers: SupportCallFinanceHandover[];
  profiles: Record<string, ProfileLite>;
  workflow: { stage: string; next_action: string };
  flags: Record<string, boolean | string | null | undefined>;
  can_manage: boolean;
};

type CallFn = (key: string, fn: () => Promise<unknown>, ok?: string) => Promise<boolean>;

type SectionProps = {
  b: Bundle;
  id: string;
  token: string | null;
  call: CallFn;
  busy: string | null;
  members: Member[];
  locked: boolean;
};

const api = (p: Pick<SectionProps, 'id' | 'token'>, path: string, body?: unknown, method = 'POST') =>
  scFetch(`/api/support-calls/${p.id}${path ? `/${path}` : ''}`, {
    method,
    accessToken: p.token,
    body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
  });

const nameOf = (b: Bundle, id: string | null | undefined) => (id ? b.profiles[id]?.full_name || 'Unknown' : '—');

const assigneeName = (b: Bundle, assignmentId: string | null) => {
  const a = b.assignments.find((x) => x.id === assignmentId);
  return a ? nameOf(b, a.member_id) : '—';
};

/* -------------------------------------------------------------------------- */
/* Layout helpers                                                             */
/* -------------------------------------------------------------------------- */

function Section({
  n,
  title,
  chip,
  defaultOpen = false,
  children,
}: {
  n: number;
  title: string;
  chip?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
        <span className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/15 text-xs font-semibold text-cyan-300">{n}</span>
          <span className="text-base font-semibold text-white">{title}</span>
        </span>
        <span className="flex items-center gap-3">
          {chip}
          <span className="text-slate-500">{open ? '▾' : '▸'}</span>
        </span>
      </button>
      {open && <div className="space-y-4 border-t border-slate-800 px-5 py-5">{children}</div>}
    </section>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-300">{children}</div>;
}

function Locked({ locked }: { locked: boolean }) {
  return locked ? <Notice tone="info">This support call is no longer open — sections are read-only.</Notice> : null;
}

/* -------------------------------------------------------------------------- */
/* 1. Intake & site                                                           */
/* -------------------------------------------------------------------------- */

const INTAKE_KEYS = [
  'report_method', 'reporter_name', 'reporter_organisation', 'reporter_email', 'reporter_phone',
  'location',
  'responsible_name', 'responsible_position', 'responsible_organisation', 'responsible_email', 'responsible_phone',
  'priority', 'operational_description',
  'supplier_invoice_number', 'third_party_job_card_number', 'po_number', 'external_quote_reference',
] as const;

function IntakeSection(p: SectionProps) {
  const sc = p.b.support_call;
  const [f, setF] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const k of INTAKE_KEYS) o[k] = ((sc as unknown as Record<string, unknown>)[k] as string | null) ?? '';
    return o;
  });
  const [loc, setLoc] = useState<LocationSelection>(() => ({
    ...emptyLocationSelection(),
    client_id: sc.client_id ?? '',
    estate_id: sc.estate_id ?? '',
    cml_location_id: sc.cml_location_id ?? '',
    onsite_location_id: sc.onsite_location_id ?? '',
    client: sc.client ?? '',
    estate_or_building: sc.estate_or_building ?? '',
    cml_location: sc.cml_location ?? '',
    onsite_location: sc.onsite_location ?? sc.site_name ?? '',
    site_name: sc.onsite_location ?? sc.site_name ?? '',
  }));
  const set = (k: string, v: string) => setF((cur) => ({ ...cur, [k]: v }));
  const text = (k: string, label: string, type = 'text') => (
    <Field label={label}>
      <input type={type} className={inputCls} value={f[k]} disabled={p.locked} onChange={(e) => set(k, e.target.value)} />
    </Field>
  );

  const locDirty =
    (loc.client_id || '') !== (sc.client_id ?? '') ||
    (loc.estate_id || '') !== (sc.estate_id ?? '') ||
    (loc.cml_location_id || '') !== (sc.cml_location_id ?? '') ||
    (loc.onsite_location_id || '') !== (sc.onsite_location_id ?? '') ||
    (loc.client || '') !== (sc.client ?? '') ||
    (loc.estate_or_building || '') !== (sc.estate_or_building ?? '') ||
    (loc.cml_location || '') !== (sc.cml_location ?? '') ||
    (loc.onsite_location || '') !== (sc.onsite_location ?? sc.site_name ?? '');
  const dirty = INTAKE_KEYS.some((k) => (f[k] || '') !== (((sc as unknown as Record<string, unknown>)[k] as string | null) ?? '')) || locDirty;

  return (
    <>
      <Card>
        <p className="mb-1 text-[11px] uppercase tracking-[0.14em] text-slate-500">Original report (immutable)</p>
        <p className="whitespace-pre-wrap">{sc.original_description}</p>
        <p className="mt-2 text-xs text-slate-500">
          Reported {fmtDateTime(sc.reported_at)} via {sc.report_method || '—'} · logged by {nameOf(p.b, sc.created_by)}
        </p>
      </Card>
      {sc.overall_status === 'draft' && !p.locked && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          This is a draft — no ticket yet.{' '}
          <button
            type="button"
            className={btnPrimary}
            disabled={p.busy === 'submit'}
            onClick={() => void p.call('submit', () => api(p, 'submit', {}), 'Support call submitted — Pending ticket created')}
          >
            {p.busy === 'submit' ? 'Submitting…' : 'Submit support call'}
          </button>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Reported via">
          <input className={inputCls} value={f.report_method} disabled={p.locked} onChange={(e) => set('report_method', e.target.value)} />
        </Field>
        {text('reporter_name', 'Reporter name')}
        {text('reporter_organisation', 'Reporter organisation')}
        {text('reporter_email', 'Reporter email', 'email')}
        {text('reporter_phone', 'Reporter phone')}
        <Field label="Priority">
          <select className={inputCls} value={f.priority} disabled={p.locked} onChange={(e) => set('priority', e.target.value)}>
            {['Critical', 'High', 'Medium', 'Low'].map((x) => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Work location">
          <select className={inputCls} value={f.location} disabled={p.locked} onChange={(e) => set('location', e.target.value)}>
            <option value="">—</option>
            <option value="on-site">On-site</option>
            <option value="remote">Remote</option>
          </select>
        </Field>
      </div>
      <LocationCascade token={p.token} value={loc} onChange={setLoc} disabled={p.locked} requireOnsite />
      <div className="grid gap-3 md:grid-cols-5">
        {text('responsible_name', 'Responsible person')}
        {text('responsible_position', 'Position')}
        {text('responsible_organisation', 'Organisation')}
        {text('responsible_email', 'Email', 'email')}
        {text('responsible_phone', 'Phone')}
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {text('supplier_invoice_number', 'Supplier invoice #')}
        {text('third_party_job_card_number', 'Third-party job card #')}
        {text('po_number', 'PO #')}
        {text('external_quote_reference', 'External quote ref')}
      </div>
      <Field label="Operational notes">
        <textarea className={textareaCls} value={f.operational_description} disabled={p.locked} onChange={(e) => set('operational_description', e.target.value)} />
      </Field>
      {!p.locked && (
        <button
          type="button"
          className={btnPrimary}
          disabled={!dirty || p.busy === 'intake'}
          onClick={() =>
            void p.call(
              'intake',
              () =>
                api(
                  p,
                  '',
                  {
                    ...Object.fromEntries(INTAKE_KEYS.map((k) => [k, f[k] === '' ? null : f[k]])),
                    client: loc.client || null,
                    client_id: loc.client_id || null,
                    estate_id: loc.estate_id || null,
                    estate_or_building: loc.estate_or_building || null,
                    cml_location_id: loc.cml_location_id || null,
                    cml_location: loc.cml_location || null,
                    onsite_location_id: loc.onsite_location_id || null,
                    onsite_location: loc.onsite_location || null,
                    site_name: loc.onsite_location || loc.site_name || null,
                  },
                  'PATCH'
                ),
              'Details saved'
            )
          }
        >
          {p.busy === 'intake' ? 'Saving…' : 'Save changes'}
        </button>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Assignment                                                              */
/* -------------------------------------------------------------------------- */

function AssignSection(p: SectionProps) {
  const current = p.b.assignments;
  const [ids, setIds] = useState<string[]>(current.map((a) => a.member_id));
  const [lead, setLead] = useState<string>(current.find((a) => a.is_lead)?.member_id ?? current[0]?.member_id ?? '');

  const toggle = (id: string) => {
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
    setIds(next);
    if (!next.includes(lead)) setLead(next[0] ?? '');
  };

  return (
    <>
      <div className="space-y-2">
        {current.length === 0 && <p className="text-sm text-amber-300">No one is assigned yet.</p>}
        {current.map((a) => (
          <Card key={a.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-white">
                {nameOf(p.b, a.member_id)} {a.is_lead && <Badge tone="cyan">Lead</Badge>}
              </span>
              <span className="text-xs text-slate-400">
                Assigned {fmtDateTime(a.assigned_at)} · {a.started_work_at ? `Started ${fmtDateTime(a.started_work_at)}` : 'Not started'}
                {a.first_submitted_at ? ` · Submitted ${fmtDateTime(a.first_submitted_at)}` : ''}
              </span>
            </div>
          </Card>
        ))}
      </div>
      {!p.locked && (
        <>
          <div className="grid max-h-60 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {p.members.map((m) => {
              const on = ids.includes(m.id);
              return (
                <div key={m.id} className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${on ? 'border-cyan-500/40 bg-cyan-500/10' : 'border-slate-800 bg-slate-950/60'}`}>
                  <label className="flex min-w-0 flex-1 items-center gap-2 text-slate-200">
                    <input type="checkbox" checked={on} onChange={() => toggle(m.id)} />
                    <span className="truncate">{m.full_name}</span>
                  </label>
                  {on && (
                    <label className="flex items-center gap-1 text-[11px] text-slate-400">
                      <input type="radio" name="lead-detail" checked={lead === m.id} onChange={() => setLead(m.id)} /> lead
                    </label>
                  )}
                </div>
              );
            })}
          </div>
          <button
            type="button"
            className={btnPrimary}
            disabled={!ids.length || p.busy === 'assign'}
            onClick={() => void p.call('assign', () => api(p, 'assign', { member_ids: ids, lead_id: lead || ids[0] }), 'Assignments updated; new members notified')}
          >
            {p.busy === 'assign' ? 'Saving…' : 'Save assignments'}
          </button>
        </>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Customer communication                                                  */
/* -------------------------------------------------------------------------- */

function CommunicationsSection(p: SectionProps) {
  const sc = p.b.support_call;
  const [kind, setKind] = useState('initial_notification');
  const [outcome, setOutcome] = useState('complete');
  const [method, setMethod] = useState('Telephone');
  const [recipient, setRecipient] = useState(sc.responsible_name || sc.reporter_name || '');
  const [contact, setContact] = useState(sc.responsible_phone || sc.reporter_phone || '');
  const [eta, setEta] = useState('');
  const [when, setWhen] = useState(nowLocalInput());
  const [notes, setNotes] = useState('');
  const [failure, setFailure] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const tone = (s: string) => (s === 'complete' ? 'emerald' : s === 'attempted' ? 'amber' : 'slate');

  const valid =
    (outcome === 'complete' ? confirmed && (kind !== 'eta_notification' || eta) : failure.trim()) ? true : false;

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Badge tone={tone(sc.initial_notification_status)}>Initial notification: {sc.initial_notification_status}</Badge>
        <Badge tone={tone(sc.eta_notification_status)}>ETA notification: {sc.eta_notification_status}</Badge>
      </div>

      {p.b.communications.length > 0 && (
        <div className="space-y-2">
          {[...p.b.communications].reverse().map((c) => (
            <Card key={c.id}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={c.outcome === 'complete' ? 'emerald' : 'amber'}>{c.outcome}</Badge>
                <span className="font-medium text-white">{c.kind.replace(/_/g, ' ')}</span>
                <span className="text-xs text-slate-500">via {c.method} · {fmtDateTime(c.communicated_at)} · {nameOf(p.b, c.actor_id)}</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                To {c.recipient_name || '—'} {c.recipient_contact ? `(${c.recipient_contact})` : ''}
                {c.eta_at ? ` · ETA ${fmtDateTime(c.eta_at)}` : ''}
              </p>
              {c.failure_reason && <p className="mt-1 text-xs text-amber-300">Reason not reached: {c.failure_reason}</p>}
              {c.notes && <p className="mt-1 text-xs text-slate-400">{c.notes}</p>}
            </Card>
          ))}
        </div>
      )}

      {!p.locked && (
        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Field label="Checkpoint">
              <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="initial_notification">Initial notification</option>
                <option value="eta_notification">ETA notification</option>
                <option value="partner_contact">Partner contact</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Outcome">
              <select className={inputCls} value={outcome} onChange={(e) => setOutcome(e.target.value)}>
                <option value="complete">Complete (customer reached)</option>
                <option value="attempted">Attempted (not reached)</option>
              </select>
            </Field>
            <Field label="Method">
              <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value)}>
                {['Email', 'Telephone', 'WhatsApp', 'Other'].map((m) => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="When">
              <input type="datetime-local" className={inputCls} value={when} onChange={(e) => setWhen(e.target.value)} />
            </Field>
            <Field label="Recipient"><input className={inputCls} value={recipient} onChange={(e) => setRecipient(e.target.value)} /></Field>
            <Field label="Contact used"><input className={inputCls} value={contact} onChange={(e) => setContact(e.target.value)} /></Field>
            {kind === 'eta_notification' && (
              <Field label="ETA given">
                <input type="datetime-local" className={inputCls} value={eta} onChange={(e) => setEta(e.target.value)} />
              </Field>
            )}
            <Field label="Notes"><input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          </div>
          {outcome === 'attempted' ? (
            <Field label="Why could they not be reached? (required)">
              <input className={inputCls} value={failure} onChange={(e) => setFailure(e.target.value)} />
            </Field>
          ) : (
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
              I confirm this communication actually took place.
            </label>
          )}
          <button
            type="button"
            className={btnPrimary}
            disabled={!valid || p.busy === 'comm'}
            onClick={() =>
              void p.call(
                'comm',
                async () => {
                  await api(p, 'communications', {
                    kind, outcome, method,
                    recipient_name: recipient, recipient_contact: contact,
                    eta_at: fromLocalInput(eta), communicated_at: fromLocalInput(when),
                    notes, failure_reason: failure, confirmed,
                  });
                  setConfirmed(false); setFailure(''); setNotes('');
                },
                'Communication recorded'
              )
            }
          >
            Record communication
          </button>
        </div>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. ETA                                                                     */
/* -------------------------------------------------------------------------- */

function EtaSection(p: SectionProps) {
  const [eta, setEta] = useState('');
  const [target, setTarget] = useState(p.b.assignments[0]?.id ?? '');
  const [notes, setNotes] = useState('');
  const events = [...p.b.eta_events].reverse();
  return (
    <>
      {events.length === 0 && <p className="text-sm text-slate-500">No ETA recorded yet.</p>}
      {events.map((e) => (
        <Card key={e.id}>
          <span className="font-medium text-white">{fmtDateTime(e.new_eta)}</span>
          <span className="ml-2 text-xs text-slate-500">
            {e.previous_eta ? `was ${fmtDateTime(e.previous_eta)} · ` : ''}
            {e.assignment_id ? assigneeName(p.b, e.assignment_id) : e.partner_assignment_id ? 'Partner' : '—'} · set by {nameOf(p.b, e.actor_id)} · {fmtDateTime(e.created_at)}
          </span>
          {e.notes && <p className="mt-1 text-xs text-slate-400">{e.notes}</p>}
        </Card>
      ))}
      {!p.locked && (
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <Field label="Whose ETA">
            <select className={inputCls} value={target} onChange={(e) => setTarget(e.target.value)}>
              {p.b.assignments.map((a) => <option key={a.id} value={a.id}>{nameOf(p.b, a.member_id)}</option>)}
              {p.b.partners.map((x) => <option key={x.id} value={`partner:${x.id}`}>{x.company_name} (partner)</option>)}
            </select>
          </Field>
          <Field label="New ETA"><input type="datetime-local" className={inputCls} value={eta} onChange={(e) => setEta(e.target.value)} /></Field>
          <Field label="Notes"><input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <div className="flex items-end">
            <button
              type="button"
              className={btnPrimary}
              disabled={!eta || p.busy === 'eta'}
              onClick={() =>
                void p.call('eta', async () => {
                  await api(p, 'eta', {
                    new_eta: fromLocalInput(eta),
                    notes,
                    assignment_id: target.startsWith('partner:') ? undefined : target || undefined,
                    partner_assignment_id: target.startsWith('partner:') ? target.slice(8) : undefined,
                  });
                  setEta(''); setNotes('');
                }, 'ETA recorded')
              }
            >
              Add ETA
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Partners                                                                */
/* -------------------------------------------------------------------------- */

function PartnersSection(p: SectionProps) {
  const [directory, setDirectory] = useState<SupportPartner[]>([]);
  const [partnerId, setPartnerId] = useState('');
  const [once, setOnce] = useState({ company_name: '', contact_person: '', email: '', telephone: '', category: '' });
  const [mode, setMode] = useState<'directory' | 'once'>('directory');

  useEffect(() => {
    if (!p.token) return;
    scFetch('/api/support-calls/partners?active=1', { accessToken: p.token })
      .then((d) => setDirectory(d.partners || []))
      .catch(() => undefined);
  }, [p.token]);

  return (
    <>
      {p.b.partners.length === 0 && <p className="text-sm text-slate-500">No external partners assigned.</p>}
      {p.b.partners.map((x) => (
        <Card key={x.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-white">
              {x.company_name} {x.is_once_off && <Badge tone="violet">Once-off</Badge>}
            </span>
            {x.arrival_confirmed_at ? (
              <Badge tone="emerald">Arrived {fmtDateTime(x.arrival_confirmed_at)}</Badge>
            ) : (
              !p.locked && (
                <button type="button" className={btnGhost} disabled={p.busy === `arr-${x.id}`}
                  onClick={() => void p.call(`arr-${x.id}`, () => api(p, 'partners', { action: 'confirm_arrival', partner_assignment_id: x.id }), 'Arrival confirmed')}>
                  Confirm arrival
                </button>
              )
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {[x.contact_person, x.telephone, x.email, x.category].filter(Boolean).join(' · ') || 'No contact details'}
          </p>
        </Card>
      ))}
      {!p.locked && (
        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="flex gap-2">
            <button type="button" className={mode === 'directory' ? btnPrimary : btnGhost} onClick={() => setMode('directory')}>From directory</button>
            <button type="button" className={mode === 'once' ? btnPrimary : btnGhost} onClick={() => setMode('once')}>Once-off partner</button>
          </div>
          {mode === 'directory' ? (
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Partner" className="min-w-[240px] flex-1">
                <select className={inputCls} value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
                  <option value="">Select…</option>
                  {directory.map((d) => <option key={d.id} value={d.id}>{d.company_name}{d.category ? ` — ${d.category}` : ''}</option>)}
                </select>
              </Field>
              <button type="button" className={btnPrimary} disabled={!partnerId || p.busy === 'partner'}
                onClick={() => void p.call('partner', async () => { await api(p, 'partners', { partner_id: partnerId }); setPartnerId(''); }, 'Partner assigned')}>
                Assign partner
              </button>
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-5">
                {(['company_name', 'contact_person', 'email', 'telephone', 'category'] as const).map((k) => (
                  <Field key={k} label={k.replace('_', ' ')}>
                    <input className={inputCls} value={once[k]} onChange={(e) => setOnce((o) => ({ ...o, [k]: e.target.value }))} />
                  </Field>
                ))}
              </div>
              <button type="button" className={btnPrimary} disabled={!once.company_name.trim() || p.busy === 'partner'}
                onClick={() => void p.call('partner', async () => { await api(p, 'partners', { once_off: true, ...once }); setOnce({ company_name: '', contact_person: '', email: '', telephone: '', category: '' }); }, 'Once-off partner assigned')}>
                Assign once-off partner
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. Visits & hardware                                                       */
/* -------------------------------------------------------------------------- */

type HwLine = { description: string; make_model: string; quantity: string; serial_number: string };

function VisitsSection(p: SectionProps) {
  const [party, setParty] = useState<'internal' | 'external'>('internal');
  const [assignmentId, setAssignmentId] = useState(p.b.assignments[0]?.id ?? '');
  const [partnerId, setPartnerId] = useState(p.b.partners[0]?.id ?? '');
  const [arrived, setArrived] = useState('');
  const [departed, setDeparted] = useState('');
  const [km, setKm] = useState('');
  const [extCost, setExtCost] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [work, setWork] = useState('');
  const [tests, setTests] = useState('');
  const [incomplete, setIncomplete] = useState(false);
  const [reason, setReason] = useState('');
  const [dependency, setDependency] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [lines, setLines] = useState<HwLine[]>([]);

  // Keep selects in sync when assignments/partners arrive after first paint
  // (empty value looks selected in the UI but leaves Save disabled).
  useEffect(() => {
    if (!assignmentId && p.b.assignments[0]?.id) setAssignmentId(p.b.assignments[0].id);
    else if (assignmentId && !p.b.assignments.some((x) => x.id === assignmentId)) {
      setAssignmentId(p.b.assignments[0]?.id ?? '');
    }
  }, [p.b.assignments, assignmentId]);

  useEffect(() => {
    if (!partnerId && p.b.partners[0]?.id) setPartnerId(p.b.partners[0].id);
    else if (partnerId && !p.b.partners.some((x) => x.id === partnerId)) {
      setPartnerId(p.b.partners[0]?.id ?? '');
    }
  }, [p.b.partners, partnerId]);

  const a = fromLocalInput(arrived);
  const d = fromLocalInput(departed);
  const mins = minutesBetween(a, d);
  const kmNum = km ? Number(km) : null;
  const partnerReady = Boolean(partnerId) && p.b.partners.some((x) => x.id === partnerId);
  const internalReady = Boolean(a && d && mins != null && assignmentId);
  const ready =
    (party === 'internal' ? internalReady : partnerReady) && (!incomplete || reason.trim());

  const hwFor = (visitId: string) => p.b.hardware_items.filter((h) => h.visit_id === visitId);

  return (
    <>
      {p.b.visits.length === 0 && <p className="text-sm text-slate-500">No visits logged yet.</p>}
      {p.b.visits.map((v) => (
        <Card key={v.id}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-white">Visit #{v.visit_number}</span>
            <Badge tone={v.party_type === 'internal' ? 'cyan' : 'violet'}>{v.party_type}</Badge>
            <span className="text-xs text-slate-400">
              {v.party_type === 'internal'
                ? assigneeName(p.b, v.assignment_id)
                : p.b.partners.find((x) => x.id === v.partner_assignment_id)?.company_name ?? 'Partner'}
              {' · '}{fmtDate(v.visit_date)}
            </span>
            {v.incomplete && <Badge tone="amber">Incomplete</Badge>}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {fmtDateTime(v.arrived_at)} → {fmtDateTime(v.departed_at)} · Labour: {formatLabourDisplay(v.labour_minutes)}
            {v.travel_km != null && ` · Travel ${v.travel_km} km = R${Number(v.travel_amount_zar ?? 0).toFixed(2)}`}
            {v.external_travel_cost_zar != null && ` · External travel R${Number(v.external_travel_cost_zar).toFixed(2)}`}
          </p>
          {v.diagnosis && <p className="mt-1 text-xs"><span className="text-slate-500">Diagnosis:</span> {v.diagnosis}</p>}
          {v.work_performed && <p className="text-xs"><span className="text-slate-500">Work:</span> {v.work_performed}</p>}
          {v.test_results && <p className="text-xs"><span className="text-slate-500">Tests:</span> {v.test_results}</p>}
          {v.incomplete && <p className="text-xs text-amber-300">Incomplete: {v.incomplete_reason}{v.dependency_notes ? ` — ${v.dependency_notes}` : ''}</p>}
          {hwFor(v.id).map((h) => (
            <p key={h.id} className="text-xs text-slate-400">🔧 {h.quantity} × {h.description}{h.make_model ? ` (${h.make_model})` : ''}{h.serial_number ? ` · S/N ${h.serial_number}` : ''}</p>
          ))}
        </Card>
      ))}

      {!p.locked && (
        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <p className="text-sm font-medium text-white">Log a visit</p>
          <div className="flex gap-2">
            <button type="button" className={party === 'internal' ? btnPrimary : btnGhost} onClick={() => setParty('internal')}>Internal</button>
            <button type="button" className={party === 'external' ? btnPrimary : btnGhost} onClick={() => setParty('external')}>Partner (external)</button>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            {party === 'internal' ? (
              <Field label="Team member">
                <select className={inputCls} value={assignmentId} onChange={(e) => setAssignmentId(e.target.value)}>
                  {p.b.assignments.map((x) => <option key={x.id} value={x.id}>{nameOf(p.b, x.member_id)}</option>)}
                </select>
              </Field>
            ) : (
              <Field label="Partner">
                <select className={inputCls} value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
                  <option value="">Select partner…</option>
                  {p.b.partners.map((x) => <option key={x.id} value={x.id}>{x.company_name}</option>)}
                </select>
              </Field>
            )}
            <Field label={party === 'internal' ? 'Arrived (required)' : 'Arrived'}><input type="datetime-local" className={inputCls} value={arrived} onChange={(e) => setArrived(e.target.value)} /></Field>
            <Field label={party === 'internal' ? 'Departed (required)' : 'Departed'}><input type="datetime-local" className={inputCls} value={departed} onChange={(e) => setDeparted(e.target.value)} /></Field>
            {party === 'internal' ? (
              <Field label="Travel (km)" hint={`R${INTERNAL_TRAVEL_RATE_ZAR.toFixed(2)} per km`}><input type="number" min="0" step="0.1" className={inputCls} value={km} onChange={(e) => setKm(e.target.value)} /></Field>
            ) : (
              <Field label="External travel cost (R, as quoted)"><input type="number" min="0" step="0.01" className={inputCls} value={extCost} onChange={(e) => setExtCost(e.target.value)} /></Field>
            )}
          </div>
          {party === 'internal' && (mins != null || kmNum) && (
            <p className="text-xs text-cyan-300">
              {mins != null && <>Labour: {formatLabourDisplay(mins)}. </>}
              {kmNum ? <>Travel: R{travelAmountZar(kmNum).toFixed(2)}.</> : null}
            </p>
          )}
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Diagnosis"><textarea className={textareaCls} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} /></Field>
            <Field label="Work performed"><textarea className={textareaCls} value={work} onChange={(e) => setWork(e.target.value)} /></Field>
            <Field label="Test results"><textarea className={textareaCls} value={tests} onChange={(e) => setTests(e.target.value)} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={incomplete} onChange={(e) => setIncomplete(e.target.checked)} /> Incomplete / waiting on a dependency
          </label>
          {incomplete && (
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Reason (required)"><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
              <Field label="Dependency notes"><input className={inputCls} value={dependency} onChange={(e) => setDependency(e.target.value)} /></Field>
              <Field label="Expected follow-up"><input type="date" className={inputCls} value={followUp} onChange={(e) => setFollowUp(e.target.value)} /></Field>
            </div>
          )}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.14em] text-slate-500">Hardware</span>
              <button type="button" className="text-xs text-cyan-300" onClick={() => setLines((l) => [...l, { description: '', make_model: '', quantity: '1', serial_number: '' }])}>+ Add line</button>
            </div>
            {lines.map((l, i) => (
              <div key={i} className="mb-2 grid gap-2 sm:grid-cols-[2fr_1.5fr_70px_1fr_auto]">
                {(['description', 'make_model', 'quantity', 'serial_number'] as const).map((k) => (
                  <input key={k} className={inputCls} placeholder={k.replace('_', ' ')} value={l[k]} onChange={(e) => setLines((all) => all.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))} />
                ))}
                <button type="button" className="text-xs text-rose-300" onClick={() => setLines((all) => all.filter((_, j) => j !== i))}>Remove</button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className={btnPrimary}
            disabled={!ready || p.busy === 'visit'}
            onClick={() =>
              void p.call('visit', async () => {
                if (party === 'external' && !partnerId) {
                  throw new Error('Select the external partner for this visit');
                }
                if (party === 'external' && ((arrived && !departed) || (!arrived && departed))) {
                  throw new Error('Provide both arrival and departure times, or leave both blank');
                }
                if (party === 'external' && arrived && departed && mins == null) {
                  throw new Error('Departure must be after arrival');
                }
                const res = await api(p, 'visits', {
                  party_type: party,
                  assignment_id: party === 'internal' ? assignmentId : undefined,
                  partner_assignment_id: party === 'external' ? partnerId : undefined,
                  arrived_at: a, departed_at: d,
                  travel_km: party === 'internal' ? kmNum : undefined,
                  external_travel_cost_zar: party === 'external' && extCost ? Number(extCost) : undefined,
                  diagnosis, work_performed: work, test_results: tests,
                  incomplete, incomplete_reason: reason, dependency_notes: dependency, expected_follow_up_date: followUp || null,
                });
                const valid = lines.filter((l) => l.description.trim());
                if (valid.length) {
                  await api(p, 'hardware', { visit_id: res.visit.id, items: valid.map((l) => ({ ...l, quantity: Number(l.quantity) || 1 })) });
                }
                setArrived(''); setDeparted(''); setKm(''); setExtCost(''); setDiagnosis(''); setWork(''); setTests('');
                setIncomplete(false); setReason(''); setDependency(''); setFollowUp(''); setLines([]);
              }, 'Visit logged')
            }
          >
            {p.busy === 'visit' ? 'Saving…' : 'Save visit'}
          </button>
          {!ready && (
            <p className="text-xs text-amber-300">
              {party === 'external' && !partnerReady
                ? 'Select a partner from the list (re-select SSC if needed).'
                : party === 'internal' && !internalReady
                  ? 'Internal visits need a team member plus arrival and departure times.'
                  : incomplete && !reason.trim()
                    ? 'Add a reason for the incomplete visit.'
                    : 'Complete the required fields to save.'}
            </p>
          )}
        </div>
      )}
      <TechnicalReviewBlock {...p} />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Technical submission review (inside Technical Work)                        */
/* -------------------------------------------------------------------------- */

function TechnicalReviewBlock(p: SectionProps) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  if (p.b.assignments.length === 0) return null;
  return (
    <div className="space-y-3 border-t border-slate-800 pt-4">
      <p className="text-sm font-medium text-white">Technical work submissions</p>
      <p className="text-xs text-slate-500">Technicians submit from their ticket Technical Work / Job Card. Review here.</p>
      {p.b.assignments.map((a) => {
        const mine = p.b.contributions.filter((c) => c.assignment_id === a.id).sort((x, y) => y.revision - x.revision);
        const latest = mine[0];
        return (
          <Card key={a.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-white">{nameOf(p.b, a.member_id)}</span>
              {latest ? (
                <Badge tone={latest.status === 'approved' ? 'emerald' : latest.status === 'returned' ? 'amber' : latest.status === 'submitted' ? 'blue' : 'slate'}>
                  {latest.status} · rev {latest.revision}
                </Badge>
              ) : (
                <Badge tone="slate">Not submitted</Badge>
              )}
            </div>
            {latest?.summary && <p className="mt-2 whitespace-pre-wrap text-xs text-slate-300">{latest.summary}</p>}
            {latest?.correction_notes && <p className="mt-1 text-xs text-amber-300">Correction notes: {latest.correction_notes}</p>}
            {latest?.status === 'submitted' && !p.locked && (
              <div className="mt-3 space-y-2">
                <input className={inputCls} placeholder="Correction notes (required when returning)" value={notes[latest.id] ?? ''} onChange={(e) => setNotes((n) => ({ ...n, [latest.id]: e.target.value }))} />
                <div className="flex gap-2">
                  <button type="button" className={btnPrimary} disabled={p.busy === `rev-${latest.id}`}
                    onClick={() => void p.call(`rev-${latest.id}`, () => api(p, 'contributions/review', { contribution_id: latest.id, action: 'accept' }), 'Technical work accepted')}>
                    Accept
                  </button>
                  <button type="button" className={btnDanger} disabled={!(notes[latest.id] ?? '').trim() || p.busy === `rev-${latest.id}`}
                    onClick={() => void p.call(`rev-${latest.id}`, () => api(p, 'contributions/review', { contribution_id: latest.id, action: 'return', correction_notes: notes[latest.id] }), 'Returned to technician')}>
                    Return
                  </button>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 8. Quotes                                                                  */
/* -------------------------------------------------------------------------- */

function QuotesSection(p: SectionProps) {
  const [q, setQ] = useState({ supplier_name: '', quote_reference: '', quote_date: '', amount: '', description: '', partner_assignment_id: '' });
  const [reason, setReason] = useState<Record<string, string>>({});
  const [next, setNext] = useState<Record<string, string>>({});
  return (
    <>
      {p.b.quotes.length === 0 && <p className="text-sm text-slate-500">No quotes recorded.</p>}
      {p.b.quotes.map((x) => (
        <Card key={x.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-white">
              {x.supplier_name} <span className="text-xs text-slate-500">rev {x.revision}</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-sm text-white">{x.currency || 'ZAR'} {Number(x.amount ?? 0).toFixed(2)}</span>
              <Badge tone={x.status === 'approved' ? 'emerald' : x.status === 'rejected' ? 'rose' : x.status === 'pending' ? 'amber' : 'slate'}>{x.status}</Badge>
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {x.quote_reference ? `Ref ${x.quote_reference} · ` : ''}{x.quote_date ? fmtDate(x.quote_date) : ''} {x.description}
          </p>
          {x.decision_at && (
            <p className="mt-1 text-xs text-slate-500">
              Decided by {nameOf(p.b, x.decision_by)} · {fmtDateTime(x.decision_at)}
              {x.decision_reason ? ` · ${x.decision_reason}` : ''}{x.next_step ? ` · next: ${x.next_step.replace(/_/g, ' ')}` : ''}
            </p>
          )}
          {x.status === 'pending' && !p.locked && (
            <div className="mt-3 grid gap-2 md:grid-cols-[1fr_200px_auto_auto]">
              <input className={inputCls} placeholder="Reason (required to reject)" value={reason[x.id] ?? ''} onChange={(e) => setReason((r) => ({ ...r, [x.id]: e.target.value }))} />
              <select className={inputCls} value={next[x.id] ?? 'different_supplier'} onChange={(e) => setNext((n) => ({ ...n, [x.id]: e.target.value }))}>
                <option value="different_supplier">If rejected: different supplier</option>
                <option value="revise_same_supplier">If rejected: revise same supplier</option>
              </select>
              <button type="button" className={btnPrimary} disabled={p.busy === `dq-${x.id}`}
                onClick={() => void p.call(`dq-${x.id}`, () => api(p, `quotes/${x.id}/decide`, { decision: 'approve', reason: reason[x.id] }), 'Quote approved')}>
                Approve
              </button>
              <button type="button" className={btnDanger} disabled={!(reason[x.id] ?? '').trim() || p.busy === `dq-${x.id}`}
                onClick={() => void p.call(`dq-${x.id}`, () => api(p, `quotes/${x.id}/decide`, { decision: 'reject', reason: reason[x.id], next_step: next[x.id] ?? 'different_supplier' }), 'Quote rejected')}>
                Reject
              </button>
            </div>
          )}
        </Card>
      ))}
      {!p.locked && (
        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <p className="text-sm font-medium text-white">Record a quote</p>
          <div className="grid gap-3 md:grid-cols-5">
            <Field label="Supplier"><input className={inputCls} value={q.supplier_name} onChange={(e) => setQ({ ...q, supplier_name: e.target.value })} /></Field>
            <Field label="Quote ref"><input className={inputCls} value={q.quote_reference} onChange={(e) => setQ({ ...q, quote_reference: e.target.value })} /></Field>
            <Field label="Quote date"><input type="date" className={inputCls} value={q.quote_date} onChange={(e) => setQ({ ...q, quote_date: e.target.value })} /></Field>
            <Field label="Amount (ZAR)"><input type="number" min="0" step="0.01" className={inputCls} value={q.amount} onChange={(e) => setQ({ ...q, amount: e.target.value })} /></Field>
            <Field label="Partner">
              <select className={inputCls} value={q.partner_assignment_id} onChange={(e) => setQ({ ...q, partner_assignment_id: e.target.value })}>
                <option value="">—</option>
                {p.b.partners.map((x) => <option key={x.id} value={x.id}>{x.company_name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Description"><input className={inputCls} value={q.description} onChange={(e) => setQ({ ...q, description: e.target.value })} /></Field>
          <button type="button" className={btnPrimary} disabled={!q.supplier_name.trim() || q.amount === '' || p.busy === 'quote'}
            onClick={() => void p.call('quote', async () => {
              await api(p, 'quotes', { ...q, amount: Number(q.amount), partner_assignment_id: q.partner_assignment_id || undefined });
              setQ({ supplier_name: '', quote_reference: '', quote_date: '', amount: '', description: '', partner_assignment_id: '' });
            }, 'Quote recorded')}>
            Save quote
          </button>
        </div>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 9. Documents                                                               */
/* -------------------------------------------------------------------------- */

const DOC_TYPES = ['photo', 'quote', 'supplier_invoice', 'third_party_job_card', 'purchase_order', 'report', 'other'];

function DocumentsSection(p: SectionProps) {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('photo');
  const [fileKey, setFileKey] = useState(0);

  const open = (docId: string) =>
    p.call(`doc-${docId}`, async () => {
      const res = await api(p, 'documents', undefined, 'GET');
      const url = (res.documents as { id: string; url: string | null }[]).find((d) => d.id === docId)?.url;
      if (!url) throw new Error('Could not create a download link');
      window.open(url, '_blank', 'noopener');
    });

  return (
    <>
      {p.b.documents.length === 0 && <p className="text-sm text-slate-500">No documents uploaded.</p>}
      {p.b.documents.map((d) => (
        <Card key={d.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              <span className="font-medium text-white">{d.file_name}</span>{' '}
              <Badge tone="slate">{d.doc_type.replace(/_/g, ' ')}</Badge>
              <span className="ml-2 text-xs text-slate-500">{fmtDateTime(d.created_at)} · {d.file_size ? `${Math.round(d.file_size / 1024)} KB` : ''}</span>
            </span>
            <button type="button" className={btnGhost} disabled={p.busy === `doc-${d.id}`} onClick={() => void open(d.id)}>Open</button>
          </div>
        </Card>
      ))}
      {!p.locked && (
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <Field label="Type">
            <select className={inputCls} value={docType} onChange={(e) => setDocType(e.target.value)}>
              {DOC_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </Field>
          <Field label="File (max 15 MB)" className="min-w-[240px] flex-1">
            <input key={fileKey} type="file" className={inputCls} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>
          <button type="button" className={btnPrimary} disabled={!file || p.busy === 'upload'}
            onClick={() => void p.call('upload', async () => {
              const fd = new FormData();
              fd.set('file', file as File);
              fd.set('doc_type', docType);
              await scFetch(`/api/support-calls/${p.id}/documents`, { method: 'POST', accessToken: p.token, body: fd });
              setFile(null); setFileKey((k) => k + 1);
            }, 'Document uploaded')}>
            {p.busy === 'upload' ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 10. Job card & signing                                                     */
/* -------------------------------------------------------------------------- */

function JobCardSection(p: SectionProps & { newLink: { url: string; expires_at: string } | null; setNewLink: (l: { url: string; expires_at: string } | null) => void }) {
  const [exc, setExc] = useState({ reason: 'Unavailable', explanation: '', method: 'Telephone', interaction_at: nowLocalInput() });
  const [showExc, setShowExc] = useState(false);
  const [copied, setCopied] = useState(false);

  const cards = [...p.b.job_cards].sort((a, b) => b.version - a.version);
  const [now] = useState(() => Date.now());
  const current = cards.find((c) => c.status !== 'superseded') ?? null;
  const activeToken = current
    ? p.b.signing_tokens.find((t) => t.job_card_id === current.id && !t.revoked_at && !t.used_at && new Date(t.expires_at).getTime() > now)
    : null;
  const sig = current ? p.b.signatures.find((s) => s.job_card_id === current.id) : null;
  const exception = current ? p.b.signature_exceptions.find((e) => e.job_card_id === current.id) : null;

  const openPdf = (id: string) =>
    p.call(`jc-${id}`, async () => {
      const res = await api(p, 'job-card', undefined, 'GET');
      const url = (res.job_cards as { id: string; url: string | null }[]).find((j) => j.id === id)?.url;
      if (!url) throw new Error('No PDF is available for this version');
      window.open(url, '_blank', 'noopener');
    });

  return (
    <>
      {cards.length === 0 && <p className="text-sm text-slate-500">No job card generated yet.</p>}
      {cards.map((c) => (
        <Card key={c.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-white">Version {c.version}</span>
            <span className="flex items-center gap-2">
              <Badge tone={c.status === 'signed' ? 'emerald' : c.status === 'superseded' ? 'slate' : c.status === 'awaiting_signature' ? 'amber' : 'blue'}>{c.status.replace(/_/g, ' ')}</Badge>
              {(c.pdf_storage_path || c.signed_pdf_storage_path) && (
                <button type="button" className={btnGhost} disabled={p.busy === `jc-${c.id}`} onClick={() => void openPdf(c.id)}>Open PDF</button>
              )}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Generated {fmtDateTime(c.generated_at)} by {nameOf(p.b, c.generated_by)}{!c.pdf_storage_path ? ' · no PDF stored' : ''}</p>
        </Card>
      ))}

      {!p.locked && (
        <button type="button" className={btnPrimary} disabled={p.busy === 'jobcard'}
          onClick={() => void p.call('jobcard', async () => {
            const res = await api(p, 'job-card', {});
            if (!res.pdf_generated) throw new Error(`Job card created but the PDF failed: ${res.pdf_error ?? 'unknown error'}`);
          }, current ? 'New job card version generated (earlier links revoked)' : 'Job card generated')}>
          {current ? 'Generate new version' : 'Generate job card'}
        </button>
      )}

      {current && (
        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <p className="text-sm font-medium text-white">Customer signature</p>
          {sig && <Notice tone="success">Signed by {sig.signer_name}{sig.signer_company ? ` (${sig.signer_company})` : ''} on {fmtDateTime(sig.signed_at)}.</Notice>}
          {exception && (
            <Notice tone="info">Signature not obtained — {exception.reason}: {exception.explanation} ({fmtDateTime(exception.interaction_at)})</Notice>
          )}

          {!sig && !p.locked && (
            <>
              {p.newLink && (
                <div className="space-y-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3">
                  <p className="text-xs text-cyan-200">Share this link with the customer. It is shown only once (expires {fmtDateTime(p.newLink.expires_at)}).</p>
                  <div className="flex gap-2">
                    <input readOnly className={inputCls} value={p.newLink.url} onFocus={(e) => e.currentTarget.select()} />
                    <button type="button" className={btnGhost}
                      onClick={async () => { await navigator.clipboard.writeText(p.newLink!.url); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}
              {activeToken && !p.newLink && <p className="text-xs text-slate-400">An active link exists (expires {fmtDateTime(activeToken.expires_at)}). Regenerate to get a new one.</p>}
              <div className="flex flex-wrap gap-2">
                <button type="button" className={btnPrimary} disabled={p.busy === 'sign'}
                  onClick={() => void p.call('sign', async () => {
                    const res = await api(p, 'signing', { action: activeToken ? 'regenerate' : 'generate' });
                    p.setNewLink({ url: res.url, expires_at: res.expires_at });
                  }, activeToken ? 'New signing link generated; the old one no longer works' : 'Signing link generated')}>
                  {activeToken ? 'Regenerate signing link' : 'Generate signing link'}
                </button>
                {!exception && (
                  <button type="button" className={btnGhost} onClick={() => setShowExc((s) => !s)}>Signature not obtained</button>
                )}
              </div>
              {showExc && (
                <div className="grid gap-3 md:grid-cols-4">
                  <Field label="Reason">
                    <select className={inputCls} value={exc.reason} onChange={(e) => setExc({ ...exc, reason: e.target.value })}>
                      {['Unavailable', 'Refused', 'Disputed work', 'Other'].map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </Field>
                  <Field label="Method"><input className={inputCls} value={exc.method} onChange={(e) => setExc({ ...exc, method: e.target.value })} /></Field>
                  <Field label="Interaction time"><input type="datetime-local" className={inputCls} value={exc.interaction_at} onChange={(e) => setExc({ ...exc, interaction_at: e.target.value })} /></Field>
                  <Field label="Explanation (required)" className="md:col-span-4"><textarea className={textareaCls} value={exc.explanation} onChange={(e) => setExc({ ...exc, explanation: e.target.value })} /></Field>
                  <div>
                    <button type="button" className={btnDanger} disabled={!exc.explanation.trim() || p.busy === 'exc'}
                      onClick={() => void p.call('exc', async () => {
                        await api(p, 'signing', { action: 'exception', reason: exc.reason, explanation: exc.explanation, method: exc.method, interaction_at: fromLocalInput(exc.interaction_at) });
                        p.setNewLink(null); setShowExc(false);
                      }, 'Signature exception recorded')}>
                      Record exception
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 11. Finance                                                                */
/* -------------------------------------------------------------------------- */

function FinanceSection(p: SectionProps) {
  const [sent, setSent] = useState({ finance_recipient: '', communication_method: 'Email', email_subject: '', notes: '', confirm: false });
  const handovers = [...p.b.finance_handovers].sort((a, b) => b.version - a.version);
  const latest = handovers[0];

  return (
    <>
      {handovers.length === 0 && <p className="text-sm text-slate-500">No finance report generated yet.</p>}
      {handovers.map((h) => (
        <Card key={h.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-white">Report v{h.version}</span>
            <span className="flex items-center gap-2">
              {h.downloaded_at && <Badge tone="blue">Downloaded</Badge>}
              {h.sent_confirmed ? <Badge tone="emerald">Sent {fmtDateTime(h.sent_at)}</Badge> : <Badge tone="amber">Not sent</Badge>}
              {!p.locked && (
                <button type="button" className={btnGhost} disabled={p.busy === `dl-${h.id}`}
                  onClick={() => void p.call(`dl-${h.id}`, async () => {
                    const res = await api(p, 'finance', { action: 'download-ack', handover_id: h.id });
                    if (res.url) window.open(res.url, '_blank', 'noopener');
                  })}>
                  Download
                </button>
              )}
            </span>
          </div>
          {h.sent_confirmed && (
            <p className="mt-1 text-xs text-slate-400">To {h.finance_recipient} via {h.communication_method} by {nameOf(p.b, h.sent_by)}{h.email_subject ? ` · "${h.email_subject}"` : ''}</p>
          )}
        </Card>
      ))}

      {!p.locked && (
        <>
          <button type="button" className={btnPrimary} disabled={p.busy === 'fin'}
            onClick={() => void p.call('fin', () => api(p, 'finance', { action: 'generate' }), 'Finance report generated')}>
            {latest ? 'Generate new report version' : 'Generate finance report'}
          </button>

          {latest && !latest.sent_confirmed && (
            <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <p className="text-sm font-medium text-white">Confirm handover to finance</p>
              {!latest.downloaded_at && <p className="text-xs text-amber-300">Download the report before confirming it was sent.</p>}
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Finance recipient"><input className={inputCls} value={sent.finance_recipient} onChange={(e) => setSent({ ...sent, finance_recipient: e.target.value })} /></Field>
                <Field label="Method">
                  <select className={inputCls} value={sent.communication_method} onChange={(e) => setSent({ ...sent, communication_method: e.target.value })}>
                    {['Email', 'WhatsApp', 'In person', 'Other'].map((m) => <option key={m}>{m}</option>)}
                  </select>
                </Field>
                <Field label="Email subject"><input className={inputCls} value={sent.email_subject} onChange={(e) => setSent({ ...sent, email_subject: e.target.value })} /></Field>
              </div>
              <Field label="Notes"><input className={inputCls} value={sent.notes} onChange={(e) => setSent({ ...sent, notes: e.target.value })} /></Field>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={sent.confirm} onChange={(e) => setSent({ ...sent, confirm: e.target.checked })} /> I confirm the report was sent to finance.
              </label>
              <button type="button" className={btnPrimary} disabled={!sent.confirm || !sent.finance_recipient.trim() || !latest.downloaded_at || p.busy === 'sent'}
                onClick={() => void p.call('sent', () => api(p, 'finance', { action: 'sent', handover_id: latest.id, ...sent }), 'Finance handover confirmed')}>
                Confirm sent
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 12. Close / cancel                                                         */
/* -------------------------------------------------------------------------- */

function CloseSection(p: SectionProps) {
  const f = p.b.flags;
  const gates: [string, boolean][] = [
    ['Team member assigned', Boolean(f.hasAssignments)],
    ['At least one visit logged', Boolean(f.hasVisits)],
    ['No open dependency', !f.hasOpenDependency],
    ['No quote pending decision', !f.hasPendingQuote],
    ['All contributions approved', !f.contributionsOutstanding && !f.contributionsAwaitingReview && Boolean(f.hasAssignments)],
    ['Job card signed or signature exception recorded', f.jobCardStatus === 'signed' || Boolean(f.hasSignatureException)],
    ['Finance handover sent', Boolean(f.financeSent)],
  ];
  const allOk = gates.every(([, ok]) => ok);
  const [resolution, setResolution] = useState('');
  const [cancel, setCancel] = useState({ reason: '', explanation: '', ticket_action: 'leave_open' });
  const [showCancel, setShowCancel] = useState(false);

  return (
    <>
      <ul className="space-y-1 text-sm">
        {gates.map(([label, ok]) => (
          <li key={label} className={ok ? 'text-emerald-300' : 'text-slate-400'}>{ok ? '✓' : '○'} {label}</li>
        ))}
      </ul>
      {!p.locked && (
        <>
          <Field label="Ticket resolution (optional)"><textarea className={textareaCls} value={resolution} onChange={(e) => setResolution(e.target.value)} /></Field>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnPrimary} disabled={!allOk || p.busy === 'close'}
              onClick={() => void p.call('close', () => api(p, 'close', { resolution }), 'Support call and ticket closed')}>
              Close support call & ticket
            </button>
            <button type="button" className={btnDanger} onClick={() => setShowCancel((s) => !s)}>Cancel support call…</button>
          </div>
          {showCancel && (
            <div className="space-y-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Reason"><input className={inputCls} value={cancel.reason} onChange={(e) => setCancel({ ...cancel, reason: e.target.value })} /></Field>
                <Field label="Linked ticket">
                  <select className={inputCls} value={cancel.ticket_action} onChange={(e) => setCancel({ ...cancel, ticket_action: e.target.value })}>
                    <option value="leave_open">Leave ticket open</option>
                    <option value="close">Close ticket too</option>
                  </select>
                </Field>
              </div>
              <Field label="Explanation (required)"><textarea className={textareaCls} value={cancel.explanation} onChange={(e) => setCancel({ ...cancel, explanation: e.target.value })} /></Field>
              <button type="button" className={btnDanger} disabled={!cancel.reason.trim() || !cancel.explanation.trim() || p.busy === 'cancel'}
                onClick={() => void p.call('cancel', () => api(p, 'cancel', cancel), 'Support call cancelled')}>
                Confirm cancellation
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 13. Audit                                                                  */
/* -------------------------------------------------------------------------- */

function AuditSection({ id, token, version }: { id: string; token: string | null; version: string }) {
  const [events, setEvents] = useState<(SupportCallAuditEvent & { actor_name: string | null })[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    scFetch(`/api/support-calls/${id}/audit?limit=300`, { accessToken: token })
      .then((d) => setEvents(d.events || []))
      .catch((e) => setErr(errorMessage(e)));
  }, [id, token, version]);

  if (err) return <Notice tone="error">{err}</Notice>;
  if (!events) return <p className="text-sm text-slate-500">Loading audit trail…</p>;
  if (!events.length) return <p className="text-sm text-slate-500">No events yet.</p>;
  return (
    <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
      {events.map((e) => (
        <Card key={e.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-white">{e.event_type.replace(/_/g, ' ')}</span>
            <span className="text-xs text-slate-500">{fmtDateTime(e.created_at)} · {e.actor_name ?? e.actor_role ?? 'system'}</span>
          </div>
          {e.reason && <p className="mt-1 text-xs text-slate-400">Reason: {e.reason}</p>}
          {(e.previous_value != null || e.new_value != null) && (
            <details className="mt-1">
              <summary className="cursor-pointer text-[11px] text-cyan-400">Details</summary>
              <pre className="mt-1 overflow-x-auto rounded-lg bg-slate-950 p-2 text-[11px] text-slate-400">
                {JSON.stringify({ previous: e.previous_value, new: e.new_value }, null, 2)}
              </pre>
            </details>
          )}
        </Card>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function SupportCallDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { session, canManageSupportCalls } = useAuth();
  const token = session?.access_token ?? null;

  const [b, setB] = useState<Bundle | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [newLink, setNewLink] = useState<{ url: string; expires_at: string } | null>(null);
  const [toast, setToast] = useState<{ tone: 'success' | 'error' | 'warning'; text: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const reload = useCallback(async () => {
    if (!token || !id) return;
    try {
      const data = (await scFetch(`/api/support-calls/${id}`, { accessToken: token })) as Bundle;
      setB(data);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!token || !canManageSupportCalls) return;
    scFetch('/api/support-calls?include=members&limit=1', { accessToken: token })
      .then((d) => setMembers(d.members || []))
      .catch(() => undefined);
  }, [token, canManageSupportCalls]);

  const call: CallFn = useCallback(
    async (key, fn, ok) => {
      setBusy(key);
      setError(null);
      setMessage(null);
      try {
        await fn();
        if (ok) {
          setMessage(ok);
          setToast({ tone: 'success', text: ok });
        }
        await reload();
        return true;
      } catch (e) {
        const msg = errorMessage(e);
        setError(msg);
        setToast({ tone: 'error', text: msg });
        return false;
      } finally {
        setBusy(null);
      }
    },
    [reload]
  );

  const version = useMemo(() => b?.support_call.updated_at ?? '', [b]);

  const { status: rtStatus } = useSupportCallRealtime({
    supportCallId: id,
    ticketId: b?.support_call?.ticket_id ?? null,
    enabled: Boolean(id && canManageSupportCalls),
    pause: Boolean(busy),
    onChange: () => {
      void reload();
    },
  });

  if (!canManageSupportCalls) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-8">
        <EmptyState title="Not available" description="Only admins and HTOs can open the full support call workspace." />
      </main>
    );
  }
  if (loading) {
    return <main className="mx-auto max-w-5xl px-6 py-12 text-center text-slate-400">Loading support call…</main>;
  }
  if (!b) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-8">
        <EmptyState title="Support call not found" description={error ?? 'It may have been removed or you may not have access.'} />
        <div className="mt-4 text-center"><Link href="/admin/support-calls" className={btnGhost}>← Back to support calls</Link></div>
      </main>
    );
  }

  const sc = b.support_call;
  const locked = sc.overall_status === 'closed' || sc.overall_status === 'cancelled';
  const sp: SectionProps = { b, id: sc.id, token, call, busy, members, locked };
  const f = b.flags;

  const chip = (ok: boolean, yes: string, no: string) => <Badge tone={ok ? 'emerald' : 'amber'}>{ok ? yes : no}</Badge>;

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-6 py-8">
      <Link href="/admin/support-calls" className="text-sm text-cyan-300 hover:underline">← All support calls</Link>

      <section className="rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-950 p-6 shadow-lg shadow-blue-950/30">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-white">{sc.support_call_number}</h1>
              <Badge tone={priorityTone(sc.priority)}>{sc.priority}</Badge>
              <StageBadge stage={b.workflow.stage} />
              {(locked || sc.overall_status === 'draft') && <Badge tone={sc.overall_status === 'draft' ? 'amber' : 'slate'}>{sc.overall_status}</Badge>}
            </div>
            <p className="mt-2 text-sm text-slate-300">
              {[sc.client, sc.estate_or_building, sc.cml_location ? `CML: ${sc.cml_location}` : null, sc.onsite_location || sc.site_name]
                .filter(Boolean)
                .join(' · ') || '—'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              HTO owner {nameOf(b, sc.hto_owner_id)} · created {fmtDateTime(sc.created_at)}
              {b.ticket && <> · Ticket <span className="text-slate-300">{b.ticket.ticket_number}</span> <Badge tone={b.ticket.status === 'pending' ? 'amber' : b.ticket.status === 'closed' ? 'slate' : 'cyan'}>{b.ticket.status}</Badge></>}
              {' · '}
              <span className={rtStatus === 'live' ? 'text-emerald-400' : rtStatus === 'error' ? 'text-amber-300' : 'text-slate-500'}>
                {rtStatus === 'live' ? 'Live' : rtStatus === 'error' ? 'Sync offline' : rtStatus === 'connecting' ? 'Connecting…' : 'Manual refresh'}
              </span>
            </p>
          </div>
          <button type="button" className={btnGhost} onClick={() => void reload()}>Refresh</button>
        </div>
        {!locked && (
          <p className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100">
            <span className="text-cyan-300">Next:</span> {b.workflow.next_action}
          </p>
        )}
        {sc.overall_status === 'cancelled' && (
          <p className="mt-3 text-sm text-rose-300">Cancelled: {sc.cancel_reason} — {sc.cancel_explanation} (ticket: {sc.cancel_ticket_action?.replace('_', ' ')})</p>
        )}
      </section>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl border px-4 py-3 text-sm shadow-xl ${
            toast.tone === 'success'
              ? 'border-emerald-500/40 bg-emerald-950/95 text-emerald-100'
              : toast.tone === 'warning'
                ? 'border-amber-500/40 bg-amber-950/95 text-amber-100'
                : 'border-rose-500/40 bg-rose-950/95 text-rose-100'
          }`}
          role="status"
        >
          {toast.text}
        </div>
      )}
      <Locked locked={locked} />

      <Section n={1} title="Intake & site" defaultOpen chip={<Badge tone="slate">{sc.reporter_name || 'Reporter n/a'}</Badge>}>
        <IntakeSection key={sc.updated_at} {...sp} />
      </Section>
      <Section n={2} title="Assignment" defaultOpen={!f.hasAssignments} chip={chip(Boolean(f.hasAssignments), `${b.assignments.length} assigned`, 'Unassigned')}>
        <AssignSection key={b.assignments.map((a) => `${a.member_id}${a.is_lead}`).join('|')} {...sp} />
      </Section>
      <Section n={3} title="Customer communication" chip={chip(sc.initial_notification_status === 'complete', 'Customer notified', `Initial: ${sc.initial_notification_status}`)}>
        <CommunicationsSection {...sp} />
      </Section>
      <Section n={4} title="ETA" chip={<Badge tone={sc.eta_notification_status === 'complete' ? 'emerald' : 'slate'}>ETA notice: {sc.eta_notification_status}</Badge>}>
        <EtaSection {...sp} />
      </Section>
      <Section n={5} title="Partners" chip={<Badge tone="slate">{b.partners.length}</Badge>}>
        <PartnersSection {...sp} />
      </Section>
      <Section n={6} title="Technical Work / Job Card" defaultOpen={Boolean(f.hasAssignments) && !f.hasVisits} chip={chip(!f.contributionsOutstanding && !f.contributionsAwaitingReview && Boolean(f.hasAssignments), `${b.visits.length} visit(s) · approved`, f.contributionsAwaitingReview ? 'Needs review' : `${b.visits.length} visit(s)`)}>
        <VisitsSection {...sp} />
      </Section>
      <Section n={7} title="Quotes" chip={<Badge tone={f.hasPendingQuote ? 'amber' : 'slate'}>{f.hasPendingQuote ? 'Decision pending' : `${b.quotes.length} quote(s)`}</Badge>}>
        <QuotesSection {...sp} />
      </Section>
      <Section n={8} title="Documents" chip={<Badge tone="slate">{b.documents.length}</Badge>}>
        <DocumentsSection {...sp} />
      </Section>
      <Section n={9} title="Job card & signature" chip={chip(f.jobCardStatus === 'signed' || Boolean(f.hasSignatureException), 'Signed / excepted', f.hasJobCard ? 'Awaiting signature' : 'Not generated')}>
        <JobCardSection {...sp} newLink={newLink} setNewLink={setNewLink} />
      </Section>
      <Section n={10} title="Finance handover" chip={chip(Boolean(f.financeSent), 'Sent', 'Not sent')}>
        <FinanceSection {...sp} />
      </Section>
      <Section n={11} title="Close or cancel" defaultOpen={b.workflow.stage === 'ready_for_finance' && Boolean(f.financeSent)}>
        <CloseSection {...sp} />
      </Section>
      <Section n={12} title="Audit trail">
        <AuditSection id={sc.id} token={token} version={version} />
      </Section>

      <p className="pb-6 text-center text-[11px] text-slate-600">
        Internal travel is reimbursed at R{INTERNAL_TRAVEL_RATE_ZAR.toFixed(2)}/km. Labour is recorded in minutes only; no labour fee is calculated.
        {' '}Last updated {fmtDateTime(sc.updated_at)} · {fmtDate(sc.created_at)}
      </p>
    </main>
  );
}
