'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { scFetch } from '@/app/lib/service-calls/client';
import {
  INVOICING_STATUS_LABELS,
  TECHNICAL_STATUS_LABELS,
} from '@/app/lib/service-calls/transitions';
import type {
  InvoicingStatus,
  ServiceCall,
  ServiceCallJobCard,
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
  const { session, user } = useAuth();
  const token = session?.access_token;
  const [sc, setSc] = useState<ServiceCall | null>(null);
  const [visits, setVisits] = useState<ServiceCallVisit[]>([]);
  const [jobCards, setJobCards] = useState<ServiceCallJobCard[]>([]);
  const [audit, setAudit] = useState<{ id: string; action: string; created_at: string; reason?: string | null }[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ticketQuery, setTicketQuery] = useState('');
  const [ticketHits, setTicketHits] = useState<
    { id: string; ticket_number: string; client: string; issue: string; status: string }[]
  >([]);
  const [technicianId, setTechnicianId] = useState('');
  const [eta, setEta] = useState('');
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
  const [correctionNotes, setCorrectionNotes] = useState('');
  const [remoteNote, setRemoteNote] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await scFetch(`/api/service-calls/${id}`, { accessToken: token });
      setSc(data.serviceCall);
      setVisits(data.visits || []);
      setJobCards(data.jobCards || []);
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

  const patch = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await scFetch(`/api/service-calls/${id}`, {
        method: 'PATCH',
        accessToken: token,
        body: JSON.stringify(body),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  if (!sc && !error) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  if (!sc) {
    return <div className="text-rose-300">{error || 'Not found'}</div>;
  }

  const techName = profiles.find((p) => p.id === sc.assigned_technician_id)?.full_name;
  const latestCard = jobCards[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={basePath} className="text-xs text-cyan-400 hover:underline">
            ← Service Calls
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-white">{sc.service_call_number}</h1>
          <p className="text-slate-300">{sc.title}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-lg bg-slate-800 px-2 py-1 text-slate-300">
              {TECHNICAL_STATUS_LABELS[sc.technical_status as TechnicalStatus]}
            </span>
            <span className="rounded-lg bg-slate-800 px-2 py-1 text-slate-300">
              {INVOICING_STATUS_LABELS[sc.invoicing_status as InvoicingStatus]}
            </span>
            <span className="rounded-lg bg-slate-800 px-2 py-1 text-slate-300">{sc.priority}</span>
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

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
          <h2 className="mb-2 font-semibold text-white">Details</h2>
          <p>Client: {sc.client || '—'}</p>
          <p>Site: {sc.site_name || '—'}</p>
          <p>Location: {sc.location || '—'} · {[sc.estate_or_building, sc.cml_location].filter(Boolean).join(', ') || '—'}</p>
          <p className="mt-2 whitespace-pre-wrap text-slate-400">{sc.description || 'No description'}</p>
          <p className="mt-2 text-xs text-slate-500">Coordinator label (HTO): {sc.coordinator_role_label || 'HTO'}</p>
          <p className="text-xs text-slate-500">Technician: {techName || 'Unassigned'}</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <h2 className="font-semibold text-white">Lifecycle actions</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void patch({ technical_status: 'in_triage' })}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-200"
            >
              Start triage
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void patch({
                  technical_status: 'remote_resolution',
                  remote_fix_possible: true,
                  remote_diagnosis: remoteNote || sc.remote_diagnosis,
                })
              }
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-200"
            >
              Remote fix path
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void patch({ technical_status: 'awaiting_assignment' })}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-200"
            >
              Needs dispatch
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void patch({ technical_status: 'on_site' })}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-200"
            >
              Mark on site
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void patch({ technical_status: 'job_card_required' })}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-200"
            >
              Job card required
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void patch({ technical_status: 'awaiting_customer_confirmation' })}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-200"
            >
              Await customer confirm
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void patch({ technical_status: 'closed' })}
              className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs text-emerald-300"
            >
              Close technically
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void patch({ technical_status: 'cancelled', cancel_reason: 'Cancelled by user' })}
              className="rounded-lg bg-rose-500/15 px-3 py-1.5 text-xs text-rose-300"
            >
              Cancel
            </button>
          </div>
          <textarea
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
            placeholder="Remote diagnosis / notes"
            value={remoteNote}
            onChange={(e) => setRemoteNote(e.target.value)}
            rows={2}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
        <h2 className="font-semibold text-white">Assign & accept</h2>
        <div className="flex flex-wrap gap-2">
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
            onClick={async () => {
              setBusy(true);
              try {
                await scFetch(`/api/service-calls/${id}/assign`, {
                  method: 'POST',
                  accessToken: token,
                  body: JSON.stringify({ technician_id: technicianId }),
                });
                await load();
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Assign failed');
              } finally {
                setBusy(false);
              }
            }}
            className="rounded-xl bg-cyan-500/20 px-3 py-2 text-sm text-cyan-300"
          >
            Assign
          </button>
          <input
            type="datetime-local"
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            value={eta}
            onChange={(e) => setEta(e.target.value)}
          />
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await scFetch(`/api/service-calls/${id}/accept`, {
                  method: 'POST',
                  accessToken: token,
                  body: JSON.stringify({ eta_at: eta ? new Date(eta).toISOString() : null }),
                });
                await load();
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Accept failed');
              } finally {
                setBusy(false);
              }
            }}
            className="rounded-xl bg-blue-500/20 px-3 py-2 text-sm text-blue-300"
          >
            Accept assignment
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
        <h2 className="font-semibold text-white">Record visit</h2>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await scFetch(`/api/service-calls/${id}/visits`, {
                method: 'POST',
                accessToken: token,
                body: JSON.stringify({
                  diagnosis: jc.diagnosis || 'On-site diagnosis',
                  work_performed: jc.work_performed || null,
                  mark_job_card: true,
                  labour_minutes: jc.labour_minutes ? Number(jc.labour_minutes) : null,
                  parts_none: true,
                }),
              });
              await load();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Visit failed');
            } finally {
              setBusy(false);
            }
          }}
          className="rounded-xl bg-slate-800 px-3 py-2 text-sm text-slate-200"
        >
          Log visit & move to job card
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await scFetch(`/api/service-calls/${id}/visits`, {
                method: 'POST',
                accessToken: token,
                body: JSON.stringify({
                  diagnosis: jc.diagnosis || 'Return visit needed',
                  return_visit_required: true,
                  return_visit_reason: 'Incomplete on first visit',
                }),
              });
              await load();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Visit failed');
            } finally {
              setBusy(false);
            }
          }}
          className="ml-2 rounded-xl bg-amber-500/15 px-3 py-2 text-sm text-amber-300"
        >
          Return visit required
        </button>
        <ul className="text-xs text-slate-400 space-y-1">
          {visits.map((v) => (
            <li key={v.id}>
              Visit #{v.visit_number} · {v.arrived_at ? new Date(v.arrived_at).toLocaleString('en-ZA') : '—'}
              {v.return_visit_required ? ' · return required' : ''}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
        <h2 className="font-semibold text-white">Job card</h2>
        {latestCard?.status === 'returned' && latestCard.correction_notes && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Correction required: {latestCard.correction_notes}
          </div>
        )}
        <div className="grid gap-2 md:grid-cols-2">
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
        </div>
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
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await scFetch(`/api/service-calls/${id}/job-card`, {
                  method: 'POST',
                  accessToken: token,
                  body: JSON.stringify({
                    ...jc,
                    labour_minutes: jc.labour_minutes ? Number(jc.labour_minutes) : null,
                  }),
                });
                await load();
              } catch (e) {
                const err = e as Error & { data?: { missing?: string[] } };
                setError(
                  err.data?.missing?.length
                    ? `Missing: ${err.data.missing.join(', ')}`
                    : err.message || 'Submit failed'
                );
              } finally {
                setBusy(false);
              }
            }}
            className="rounded-xl bg-cyan-500/20 px-3 py-2 text-sm text-cyan-300"
          >
            Submit job card
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await scFetch(`/api/service-calls/${id}/job-card/review`, {
                  method: 'POST',
                  accessToken: token,
                  body: JSON.stringify({ decision: 'accept' }),
                });
                await load();
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Accept failed');
              } finally {
                setBusy(false);
              }
            }}
            className="rounded-xl bg-emerald-500/20 px-3 py-2 text-sm text-emerald-300"
          >
            Accept job card → Ready to invoice
          </button>
          <input
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            placeholder="Correction notes"
            value={correctionNotes}
            onChange={(e) => setCorrectionNotes(e.target.value)}
          />
          <button
            type="button"
            disabled={busy || !correctionNotes.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                await scFetch(`/api/service-calls/${id}/job-card/review`, {
                  method: 'POST',
                  accessToken: token,
                  body: JSON.stringify({ decision: 'return', correction_notes: correctionNotes }),
                });
                setCorrectionNotes('');
                await load();
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Return failed');
              } finally {
                setBusy(false);
              }
            }}
            className="rounded-xl bg-amber-500/20 px-3 py-2 text-sm text-amber-300"
          >
            Return for correction
          </button>
        </div>
        {latestCard && (
          <p className="text-xs text-slate-500">
            Latest card: {latestCard.status}
            {latestCard.submitted_at ? ` · submitted ${new Date(latestCard.submitted_at).toLocaleString('en-ZA')}` : ''}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
        <h2 className="font-semibold text-white">Invoicing (tracking only)</h2>
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
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          placeholder="Invoice number"
          defaultValue={sc.invoice_number || ''}
          onBlur={(e) => {
            if (e.target.value !== (sc.invoice_number || '')) {
              void patch({ invoice_number: e.target.value || null });
            }
          }}
        />
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
        <h2 className="font-semibold text-white">Link ticket</h2>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
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
          {sc.ticket_id && (
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await scFetch(`/api/service-calls/${id}/link-ticket`, {
                    method: 'DELETE',
                    accessToken: token,
                  });
                  await load();
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Unlink failed');
                } finally {
                  setBusy(false);
                }
              }}
              className="rounded-xl bg-rose-500/15 px-3 py-2 text-sm text-rose-300"
            >
              Unlink
            </button>
          )}
        </div>
        <ul className="space-y-1">
          {ticketHits.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                className="w-full rounded-xl border border-slate-800 px-3 py-2 text-left text-sm text-slate-300 hover:border-cyan-500/40"
                onClick={async () => {
                  setBusy(true);
                  try {
                    await scFetch(`/api/service-calls/${id}/link-ticket`, {
                      method: 'POST',
                      accessToken: token,
                      body: JSON.stringify({ ticket_id: t.id }),
                    });
                    setTicketHits([]);
                    setTicketQuery('');
                    await load();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Link failed');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <span className="text-cyan-300">{t.ticket_number}</span> · {t.client} · {t.status}
                <div className="text-xs text-slate-500 line-clamp-1">{t.issue}</div>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-2 font-semibold text-white">Audit timeline</h2>
        <ul className="space-y-2 text-xs text-slate-400">
          {audit.map((a) => (
            <li key={a.id}>
              {new Date(a.created_at).toLocaleString('en-ZA')} · {a.action}
              {a.reason ? ` — ${a.reason}` : ''}
            </li>
          ))}
          {!audit.length && <li>No audit events yet.</li>}
        </ul>
        <p className="mt-3 text-[10px] text-slate-600">Signed in as {user?.email}</p>
      </section>
    </div>
  );
}
