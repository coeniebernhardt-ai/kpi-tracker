'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { scFetch } from '@/app/lib/service-calls/client';
import {
  resolveNextAction,
  resolveViewerRole,
  type NextActionKind,
} from '@/app/lib/service-calls/next-action';
import {
  INVOICING_STATUS_LABELS,
  TECHNICAL_STATUS_LABELS,
} from '@/app/lib/service-calls/transitions';
import type {
  InvoicingStatus,
  ServiceCall,
  ServiceCallJobCard,
  ServiceCallQuote,
  ServiceCallVisit,
  TechnicalStatus,
} from '@/app/lib/service-calls/types';
import { getAllProfiles, type Profile } from '@/app/lib/supabase';

type Props = {
  id: string;
  basePath: '/admin/service-calls' | '/dashboard/service-calls';
  ticketsHref?: string;
};

export default function ServiceCallDetail({ id, basePath, ticketsHref = '/admin/tickets' }: Props) {
  const { session, user, isAdmin } = useAuth();
  const token = session?.access_token;
  const [sc, setSc] = useState<ServiceCall | null>(null);
  const [visits, setVisits] = useState<ServiceCallVisit[]>([]);
  const [jobCards, setJobCards] = useState<ServiceCallJobCard[]>([]);
  const [quotes, setQuotes] = useState<ServiceCallQuote[]>([]);
  const [assigneeName, setAssigneeName] = useState<string | null>(null);
  const [audit, setAudit] = useState<{ id: string; action: string; created_at: string; reason?: string | null }[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [ticketQuery, setTicketQuery] = useState('');
  const [ticketHits, setTicketHits] = useState<
    { id: string; ticket_number: string; client: string; issue: string; status: string }[]
  >([]);
  const [technicianId, setTechnicianId] = useState('');
  const [eta, setEta] = useState('');
  const [remoteNote, setRemoteNote] = useState('');
  const [visitNote, setVisitNote] = useState('');
  const [correctionNotes, setCorrectionNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNextStep, setRejectNextStep] = useState<'revise_same_supplier' | 'different_supplier'>(
    'revise_same_supplier'
  );
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideTech, setOverrideTech] = useState('');
  const [overrideInv, setOverrideInv] = useState('');
  const [quoteForm, setQuoteForm] = useState({
    supplier_name: '',
    quote_reference: '',
    amount: '',
    description: '',
  });
  const [jc, setJc] = useState({
    diagnosis: '',
    work_performed: '',
    labour_minutes: '',
    parts_none: true,
    test_results: '',
    evidence_notes: '',
    signoff_exception: '',
    customer_signoff_obtained: false,
  });

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await scFetch(`/api/service-calls/${id}`, { accessToken: token });
      setSc(data.serviceCall);
      setVisits(data.visits || []);
      setJobCards(data.jobCards || []);
      setQuotes(data.quotes || []);
      setAssigneeName(data.assigneeName || null);
      const a = await scFetch(`/api/service-calls/${id}/audit`, { accessToken: token });
      setAudit(a.audit || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, [id, token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void getAllProfiles().then(setProfiles).catch(() => setProfiles([]));
  }, []);

  const role = useMemo(() => {
    if (!sc || !user?.id) return 'viewer' as const;
    return resolveViewerRole(sc, user.id, isAdmin);
  }, [sc, user?.id, isAdmin]);

  const pendingQuote = useMemo(() => quotes.find((q) => q.status === 'pending') || null, [quotes]);
  const latestCard = jobCards[0];
  const submittedJc = latestCard?.status === 'submitted';

  const plan = useMemo(() => {
    if (!sc) return null;
    return resolveNextAction(sc, role, {
      hasPendingQuote: Boolean(pendingQuote),
      hasSubmittedJobCard: submittedJc,
    });
  }, [sc, role, pendingQuote, submittedJc]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      const err = e as Error & { status?: number; data?: { error?: string } };
      if (err.status === 409) {
        setError(err.data?.error || err.message || 'Conflict — refreshed latest state');
        await load();
      } else {
        setError(err.message || 'Action failed');
      }
    } finally {
      setBusy(false);
    }
  };

  const patch = (body: Record<string, unknown>) =>
    run(async () => {
      await scFetch(`/api/service-calls/${id}`, {
        method: 'PATCH',
        accessToken: token,
        body: JSON.stringify(body),
      });
    });

  if (!sc && !error) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  if (!sc || !plan) {
    return <div className="text-rose-300">{error || 'Not found'}</div>;
  }

  const techLabel = TECHNICAL_STATUS_LABELS[sc.technical_status as TechnicalStatus];
  const invLabel = INVOICING_STATUS_LABELS[sc.invoicing_status as InvoicingStatus];
  const displayAssignee =
    assigneeName ||
    profiles.find((p) => p.id === sc.assigned_technician_id)?.full_name ||
    (sc.assigned_technician_id ? 'Assigned' : 'Unassigned');

  const secondaryKinds = plan.secondary.filter((k) => k !== plan.primary);

  const actionButton = (kind: NextActionKind, primary: boolean) => {
    const cls = primary
      ? 'rounded-xl bg-cyan-500/25 px-4 py-2.5 text-sm font-medium text-cyan-100 ring-1 ring-cyan-500/40 disabled:opacity-50'
      : 'rounded-xl bg-slate-800 px-3 py-2 text-sm text-slate-200 disabled:opacity-50';

    switch (kind) {
      case 'start_triage':
        return (
          <button key={kind} type="button" disabled={busy} className={cls} onClick={() => void patch({ technical_status: 'in_triage' })}>
            Start triage
          </button>
        );
      case 'remote_resolve':
        return (
          <button
            key={kind}
            type="button"
            disabled={busy}
            className={cls}
            onClick={() =>
              void patch({
                technical_status: 'remote_resolution',
                remote_fix_possible: true,
                remote_diagnosis: remoteNote || sc.remote_diagnosis,
              })
            }
          >
            Remote resolution
          </button>
        );
      case 'needs_dispatch':
        return (
          <button
            key={kind}
            type="button"
            disabled={busy}
            className={cls}
            onClick={() =>
              void patch({
                technical_status: sc.assigned_technician_id ? 'awaiting_acceptance' : 'awaiting_assignment',
              })
            }
          >
            Needs site visit
          </button>
        );
      case 'accept_assignment':
        return (
          <button
            key={kind}
            type="button"
            disabled={busy}
            className={cls}
            onClick={() =>
              void run(async () => {
                await scFetch(`/api/service-calls/${id}/accept`, {
                  method: 'POST',
                  accessToken: token,
                  body: JSON.stringify({ eta_at: eta ? new Date(eta).toISOString() : null }),
                });
              })
            }
          >
            Accept assignment
          </button>
        );
      case 'mark_on_site':
        return (
          <button key={kind} type="button" disabled={busy} className={cls} onClick={() => void patch({ technical_status: 'on_site' })}>
            Mark on site
          </button>
        );
      case 'log_visit':
        return (
          <button
            key={kind}
            type="button"
            disabled={busy}
            className={cls}
            onClick={() =>
              void run(async () => {
                await scFetch(`/api/service-calls/${id}/visits`, {
                  method: 'POST',
                  accessToken: token,
                  body: JSON.stringify({
                    diagnosis: visitNote || jc.diagnosis || 'On-site diagnosis',
                    work_performed: jc.work_performed || null,
                    mark_job_card: true,
                    labour_minutes: jc.labour_minutes ? Number(jc.labour_minutes) : null,
                    parts_none: true,
                  }),
                });
              })
            }
          >
            Log visit → job card
          </button>
        );
      case 'return_visit':
        return (
          <button
            key={kind}
            type="button"
            disabled={busy}
            className={cls}
            onClick={() =>
              void run(async () => {
                await scFetch(`/api/service-calls/${id}/visits`, {
                  method: 'POST',
                  accessToken: token,
                  body: JSON.stringify({
                    diagnosis: visitNote || 'Return visit needed',
                    return_visit_required: true,
                    return_visit_reason: visitNote || 'Incomplete on first visit',
                  }),
                });
              })
            }
          >
            Return visit required
          </button>
        );
      case 'await_quote':
        return null; // form below
      case 'decide_quote':
        return null; // decide UI below
      case 'submit_job_card':
        return (
          <button
            key={kind}
            type="button"
            disabled={busy}
            className={cls}
            onClick={() =>
              void run(async () => {
                await scFetch(`/api/service-calls/${id}/job-card`, {
                  method: 'POST',
                  accessToken: token,
                  body: JSON.stringify({
                    ...jc,
                    labour_minutes: jc.labour_minutes ? Number(jc.labour_minutes) : null,
                  }),
                });
              })
            }
          >
            Submit job card
          </button>
        );
      case 'accept_job_card':
        return (
          <button
            key={kind}
            type="button"
            disabled={busy}
            className={cls}
            onClick={() =>
              void run(async () => {
                await scFetch(`/api/service-calls/${id}/job-card/review`, {
                  method: 'POST',
                  accessToken: token,
                  body: JSON.stringify({ decision: 'accept' }),
                });
              })
            }
          >
            Accept job card
          </button>
        );
      case 'return_job_card':
        return (
          <button
            key={kind}
            type="button"
            disabled={busy || !correctionNotes.trim()}
            className={cls}
            onClick={() =>
              void run(async () => {
                await scFetch(`/api/service-calls/${id}/job-card/review`, {
                  method: 'POST',
                  accessToken: token,
                  body: JSON.stringify({ decision: 'return', correction_notes: correctionNotes }),
                });
                setCorrectionNotes('');
              })
            }
          >
            Return for correction
          </button>
        );
      case 'await_customer':
        return (
          <button
            key={kind}
            type="button"
            disabled={busy}
            className={cls}
            onClick={() => void patch({ technical_status: 'awaiting_customer_confirmation' })}
          >
            Await customer confirmation
          </button>
        );
      case 'close_technical':
        return (
          <button
            key={kind}
            type="button"
            disabled={busy}
            className={cls}
            onClick={() => void patch({ technical_status: 'closed' })}
          >
            Close technically
          </button>
        );
      case 'link_ticket':
      case 'admin_assign':
      case 'admin_override':
      case 'admin_invoice':
      case 'none':
      default:
        return null;
    }
  };

  const showJobCardForm =
    plan.primary === 'submit_job_card' ||
    secondaryKinds.includes('submit_job_card') ||
    plan.primary === 'log_visit';
  const showQuoteDecide = plan.primary === 'decide_quote' || Boolean(pendingQuote);
  const showQuoteAdd = plan.primary === 'await_quote' || secondaryKinds.includes('await_quote');
  const showAcceptEta = plan.primary === 'accept_assignment' || secondaryKinds.includes('accept_assignment');
  const showRemoteNote =
    plan.primary === 'start_triage' ||
    plan.primary === 'remote_resolve' ||
    secondaryKinds.includes('remote_resolve');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={basePath} className="text-xs text-cyan-400 hover:underline">
            ← Service Calls
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-white">{sc.service_call_number}</h1>
          <p className="text-slate-300">{sc.title}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-lg bg-slate-800 px-2 py-1 text-slate-300">{techLabel}</span>
            <span className="rounded-lg bg-slate-800 px-2 py-1 text-slate-300">{invLabel}</span>
            <span className="rounded-lg bg-slate-800 px-2 py-1 text-slate-300">{sc.priority}</span>
          </div>
          <div className="mt-3 space-y-1 text-sm text-slate-400">
            <p>
              {sc.client || '—'} · {sc.site_name || '—'}
              {sc.location ? ` · ${sc.location}` : ''}
            </p>
            <p>
              Assignee: <span className="text-slate-200">{displayAssignee}</span>
              {sc.coordinator_role_label ? (
                <span className="ml-2 text-xs text-slate-500">({sc.coordinator_role_label})</span>
              ) : null}
            </p>
            <p className="text-xs text-slate-500">
              Updated {new Date(sc.updated_at).toLocaleString('en-ZA')}
            </p>
          </div>
        </div>
        {sc.ticket_id && (
          <Link
            href={`${ticketsHref}?focus=${sc.ticket_id}`}
            className="rounded-xl bg-blue-500/15 px-3 py-2 text-sm text-blue-300 ring-1 ring-blue-500/30"
          >
            Open linked ticket
          </Link>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {/* Next Action */}
      <section className="rounded-2xl border border-cyan-500/25 bg-cyan-500/5 p-5 space-y-4">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-cyan-400/80">Next action</p>
          <h2 className="text-lg font-semibold text-white">{plan.label}</h2>
          <p className="mt-1 text-sm text-slate-400">{plan.description}</p>
          {plan.blockedReason && (
            <p className="mt-2 text-xs text-amber-300">{plan.blockedReason}</p>
          )}
        </div>

        {showRemoteNote && (
          <textarea
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            placeholder="Remote diagnosis / triage notes"
            value={remoteNote}
            onChange={(e) => setRemoteNote(e.target.value)}
            rows={2}
          />
        )}

        {showAcceptEta && (
          <label className="block text-xs text-slate-400">
            ETA (optional)
            <input
              type="datetime-local"
              className="mt-1 w-full max-w-xs rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              value={eta}
              onChange={(e) => setEta(e.target.value)}
            />
          </label>
        )}

        {(plan.primary === 'log_visit' || secondaryKinds.includes('log_visit') || secondaryKinds.includes('return_visit')) && (
          <textarea
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            placeholder="Visit / diagnosis notes"
            value={visitNote}
            onChange={(e) => setVisitNote(e.target.value)}
            rows={2}
          />
        )}

        {showQuoteDecide && pendingQuote && (
          <div className="rounded-xl border border-slate-700 bg-slate-950/80 p-4 space-y-3">
            <p className="text-sm text-white">
              Quote rev {pendingQuote.revision} · {pendingQuote.supplier_name}
              {pendingQuote.amount != null ? ` · ${pendingQuote.currency || 'ZAR'} ${pendingQuote.amount}` : ''}
            </p>
            {pendingQuote.quote_reference && (
              <p className="text-xs text-slate-500">Ref: {pendingQuote.quote_reference}</p>
            )}
            {pendingQuote.description && (
              <p className="text-sm text-slate-400 whitespace-pre-wrap">{pendingQuote.description}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                className="rounded-xl bg-emerald-500/20 px-4 py-2 text-sm text-emerald-300"
                onClick={() =>
                  void run(async () => {
                    await scFetch(`/api/service-calls/${id}/quotes/${pendingQuote.id}/decide`, {
                      method: 'POST',
                      accessToken: token,
                      body: JSON.stringify({ decision: 'approve' }),
                    });
                  })
                }
              >
                Approve quote
              </button>
              <button
                type="button"
                disabled={busy}
                className="rounded-xl bg-rose-500/15 px-4 py-2 text-sm text-rose-300"
                onClick={() => setShowRejectModal(true)}
              >
                Reject quote
              </button>
            </div>
          </div>
        )}

        {showRejectModal && pendingQuote && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 space-y-3">
            <p className="text-sm font-medium text-rose-200">Reject quote — reason required</p>
            <textarea
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={2}
              placeholder="Why is this quote rejected?"
            />
            <select
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              value={rejectNextStep}
              onChange={(e) => setRejectNextStep(e.target.value as typeof rejectNextStep)}
            >
              <option value="revise_same_supplier">Revise with same supplier</option>
              <option value="different_supplier">Try a different supplier</option>
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy || !rejectReason.trim()}
                className="rounded-xl bg-rose-500/25 px-3 py-2 text-sm text-rose-100 disabled:opacity-50"
                onClick={() =>
                  void run(async () => {
                    await scFetch(`/api/service-calls/${id}/quotes/${pendingQuote.id}/decide`, {
                      method: 'POST',
                      accessToken: token,
                      body: JSON.stringify({
                        decision: 'reject',
                        reason: rejectReason.trim(),
                        next_step: rejectNextStep,
                      }),
                    });
                    setShowRejectModal(false);
                    setRejectReason('');
                  })
                }
              >
                Confirm reject
              </button>
              <button
                type="button"
                className="rounded-xl bg-slate-800 px-3 py-2 text-sm text-slate-300"
                onClick={() => setShowRejectModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {showQuoteAdd && !pendingQuote && (
          <div className="grid gap-2 md:grid-cols-2">
            <input
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              placeholder="Supplier name *"
              value={quoteForm.supplier_name}
              onChange={(e) => setQuoteForm((s) => ({ ...s, supplier_name: e.target.value }))}
            />
            <input
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              placeholder="Quote reference"
              value={quoteForm.quote_reference}
              onChange={(e) => setQuoteForm((s) => ({ ...s, quote_reference: e.target.value }))}
            />
            <input
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              placeholder="Amount"
              value={quoteForm.amount}
              onChange={(e) => setQuoteForm((s) => ({ ...s, amount: e.target.value }))}
            />
            <input
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              placeholder="Description"
              value={quoteForm.description}
              onChange={(e) => setQuoteForm((s) => ({ ...s, description: e.target.value }))}
            />
            <button
              type="button"
              disabled={busy || !quoteForm.supplier_name.trim()}
              className="rounded-xl bg-cyan-500/25 px-4 py-2 text-sm text-cyan-100 disabled:opacity-50 md:col-span-2"
              onClick={() =>
                void run(async () => {
                  await scFetch(`/api/service-calls/${id}/quotes`, {
                    method: 'POST',
                    accessToken: token,
                    body: JSON.stringify({
                      supplier_name: quoteForm.supplier_name.trim(),
                      quote_reference: quoteForm.quote_reference.trim() || null,
                      amount: quoteForm.amount ? Number(quoteForm.amount) : null,
                      description: quoteForm.description.trim() || null,
                    }),
                  });
                  setQuoteForm({ supplier_name: '', quote_reference: '', amount: '', description: '' });
                })
              }
            >
              Add supplier quote
            </button>
          </div>
        )}

        {showJobCardForm && (
          <div className="grid gap-2 md:grid-cols-2">
            {latestCard?.status === 'returned' && latestCard.correction_notes && (
              <div className="md:col-span-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                Correction required: {latestCard.correction_notes}
              </div>
            )}
            <textarea
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              placeholder="Diagnosis *"
              value={jc.diagnosis}
              onChange={(e) => setJc((s) => ({ ...s, diagnosis: e.target.value }))}
            />
            <textarea
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              placeholder="Work performed *"
              value={jc.work_performed}
              onChange={(e) => setJc((s) => ({ ...s, work_performed: e.target.value }))}
            />
            <input
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              placeholder="Labour minutes *"
              value={jc.labour_minutes}
              onChange={(e) => setJc((s) => ({ ...s, labour_minutes: e.target.value }))}
            />
            <input
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              placeholder="Test results *"
              value={jc.test_results}
              onChange={(e) => setJc((s) => ({ ...s, test_results: e.target.value }))}
            />
            <input
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              placeholder="Evidence notes"
              value={jc.evidence_notes}
              onChange={(e) => setJc((s) => ({ ...s, evidence_notes: e.target.value }))}
            />
            <input
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              placeholder="Sign-off exception (if no customer sign-off)"
              value={jc.signoff_exception}
              onChange={(e) => setJc((s) => ({ ...s, signoff_exception: e.target.value }))}
            />
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={jc.parts_none}
                onChange={(e) => setJc((s) => ({ ...s, parts_none: e.target.checked }))}
              />
              No parts used
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={jc.customer_signoff_obtained}
                onChange={(e) => setJc((s) => ({ ...s, customer_signoff_obtained: e.target.checked }))}
              />
              Customer sign-off obtained
            </label>
            <label className="md:col-span-2 block text-xs text-slate-400">
              Evidence attachment (optional)
              <input
                type="file"
                className="mt-1 block w-full text-sm text-slate-300"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  void run(async () => {
                    const fd = new FormData();
                    fd.append('file', file);
                    await scFetch(`/api/service-calls/${id}/documents`, {
                      method: 'POST',
                      accessToken: token,
                      body: fd,
                    });
                  });
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        )}

        {(plan.primary === 'return_job_card' || secondaryKinds.includes('return_job_card')) && (
          <input
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            placeholder="Correction notes (required to return)"
            value={correctionNotes}
            onChange={(e) => setCorrectionNotes(e.target.value)}
          />
        )}

        <div className="flex flex-wrap gap-2">
          {actionButton(plan.primary, true)}
          {secondaryKinds.map((k) => actionButton(k, false))}
        </div>
      </section>

      {/* Admin strip */}
      {isAdmin && (
        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-amber-100">Admin controls</h2>
          <div className="flex flex-wrap gap-2 items-end">
            <select
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              value={technicianId}
              onChange={(e) => setTechnicianId(e.target.value)}
            >
              <option value="">Select technician</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy || !technicianId}
              className="rounded-xl bg-cyan-500/20 px-3 py-2 text-sm text-cyan-300 disabled:opacity-50"
              onClick={() =>
                void run(async () => {
                  await scFetch(`/api/service-calls/${id}/assign`, {
                    method: 'POST',
                    accessToken: token,
                    body: JSON.stringify({ technician_id: technicianId }),
                  });
                })
              }
            >
              Assign / reassign
            </button>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            <select
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              value={overrideTech}
              onChange={(e) => setOverrideTech(e.target.value)}
            >
              <option value="">Override technical status…</option>
              {(Object.keys(TECHNICAL_STATUS_LABELS) as TechnicalStatus[]).map((st) => (
                <option key={st} value={st}>
                  {TECHNICAL_STATUS_LABELS[st]}
                </option>
              ))}
            </select>
            <select
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              value={overrideInv}
              onChange={(e) => setOverrideInv(e.target.value)}
            >
              <option value="">Override invoicing…</option>
              {(Object.keys(INVOICING_STATUS_LABELS) as InvoicingStatus[]).map((st) => (
                <option key={st} value={st}>
                  {INVOICING_STATUS_LABELS[st]}
                </option>
              ))}
            </select>
            <input
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              placeholder="Override reason (required)"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
            />
          </div>
          <button
            type="button"
            disabled={busy || !overrideReason.trim() || (!overrideTech && !overrideInv)}
            className="rounded-xl bg-amber-500/20 px-3 py-2 text-sm text-amber-200 disabled:opacity-50"
            onClick={() =>
              void run(async () => {
                await scFetch(`/api/service-calls/${id}/override`, {
                  method: 'POST',
                  accessToken: token,
                  body: JSON.stringify({
                    reason: overrideReason.trim(),
                    technical_status: overrideTech || undefined,
                    invoicing_status: overrideInv || undefined,
                  }),
                });
                setOverrideReason('');
                setOverrideTech('');
                setOverrideInv('');
              })
            }
          >
            Apply override
          </button>

          <div className="flex flex-wrap gap-2">
            {(
              [
                'preparing_invoice',
                'awaiting_charge_review',
                'invoice_issued',
                'payment_outstanding',
                'paid',
                'disputed',
              ] as InvoicingStatus[]
            ).map((st) => (
              <button
                key={st}
                type="button"
                disabled={busy}
                onClick={() => void patch({ invoicing_status: st })}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-200"
              >
                {INVOICING_STATUS_LABELS[st]}
              </button>
            ))}
          </div>
          <input
            className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            placeholder="Invoice number"
            defaultValue={sc.invoice_number || ''}
            onBlur={(e) => {
              if (e.target.value !== (sc.invoice_number || '')) {
                void patch({ invoice_number: e.target.value || null });
              }
            }}
          />
        </section>
      )}

      {/* Link ticket when unlinked */}
      {!sc.ticket_id && (isAdmin || role === 'assignee' || role === 'creator') && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <h2 className="font-semibold text-white">Link ticket</h2>
          <input
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            placeholder="Search tickets…"
            value={ticketQuery}
            onChange={async (e) => {
              const v = e.target.value;
              setTicketQuery(v);
              if (v.trim().length < 2) {
                setTicketHits([]);
                return;
              }
              try {
                const data = await scFetch(
                  `/api/service-calls/search-tickets?q=${encodeURIComponent(v.trim())}`,
                  { accessToken: token }
                );
                setTicketHits(data.tickets || []);
              } catch {
                setTicketHits([]);
              }
            }}
          />
          <ul className="space-y-1">
            {ticketHits.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className="w-full rounded-xl border border-slate-800 px-3 py-2 text-left text-sm text-slate-300 hover:border-cyan-500/40"
                  onClick={() =>
                    void run(async () => {
                      await scFetch(`/api/service-calls/${id}/link-ticket`, {
                        method: 'POST',
                        accessToken: token,
                        body: JSON.stringify({ ticket_id: t.id }),
                      });
                      setTicketHits([]);
                      setTicketQuery('');
                    })
                  }
                >
                  <span className="text-cyan-300">{t.ticket_number}</span> · {t.client} · {t.status}
                  <div className="text-xs text-slate-500 line-clamp-1">{t.issue}</div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Collapsed timeline */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setTimelineOpen((o) => !o)}
        >
          <h2 className="font-semibold text-white">Timeline</h2>
          <span className="text-xs text-slate-500">{timelineOpen ? 'Hide' : 'Show'}</span>
        </button>
        {timelineOpen && (
          <div className="mt-3 space-y-4">
            {quotes.length > 0 && (
              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Quotes</p>
                <ul className="space-y-1 text-xs text-slate-400">
                  {quotes.map((q) => (
                    <li key={q.id}>
                      Rev {q.revision} · {q.supplier_name} · {q.status}
                      {q.amount != null ? ` · ${q.currency} ${q.amount}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {visits.length > 0 && (
              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Visits</p>
                <ul className="space-y-1 text-xs text-slate-400">
                  {visits.map((v) => (
                    <li key={v.id}>
                      Visit #{v.visit_number} ·{' '}
                      {v.arrived_at ? new Date(v.arrived_at).toLocaleString('en-ZA') : '—'}
                      {v.return_visit_required ? ' · return required' : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {jobCards.length > 0 && (
              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Job cards</p>
                <ul className="space-y-1 text-xs text-slate-400">
                  {jobCards.map((c) => (
                    <li key={c.id}>
                      {c.status}
                      {c.submitted_at
                        ? ` · submitted ${new Date(c.submitted_at).toLocaleString('en-ZA')}`
                        : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Audit</p>
              <ul className="space-y-2 text-xs text-slate-400">
                {audit.map((a) => (
                  <li key={a.id}>
                    {new Date(a.created_at).toLocaleString('en-ZA')} · {a.action}
                    {a.reason ? ` — ${a.reason}` : ''}
                  </li>
                ))}
                {!audit.length && <li>No audit events yet.</li>}
              </ul>
            </div>
          </div>
        )}
      </section>

      <p className="text-[10px] text-slate-600">Signed in as {user?.email}</p>
    </div>
  );
}
