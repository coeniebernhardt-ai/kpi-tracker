'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { scFetch } from '../../lib/support-calls/client';
import { INTERNAL_TRAVEL_RATE_ZAR } from '../../lib/support-calls/constants';
import { formatLabourDisplay, minutesBetween, travelAmountZar } from '../../lib/support-calls/labour';
import type {
  SupportCall,
  SupportCallAssignment,
  SupportCallContribution,
  SupportCallEtaEvent,
  SupportCallHardwareItem,
  SupportCallVisit,
} from '../../lib/support-calls/types';
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
  priorityTone,
  textareaCls,
} from './sc-ui';

type MemberBundle = {
  support_call: SupportCall | null;
  my_assignment?: SupportCallAssignment | null;
  visits?: SupportCallVisit[];
  hardware_items?: SupportCallHardwareItem[];
  contributions?: SupportCallContribution[];
  eta_events?: SupportCallEtaEvent[];
  workflow?: { stage: string; next_action: string };
  can_manage?: boolean;
};

type HardwareLine = { description: string; make_model: string; quantity: string; serial_number: string };
const emptyLine = (): HardwareLine => ({ description: '', make_model: '', quantity: '1', serial_number: '' });

/**
 * Shown when a dashboard ticket is expanded. Renders nothing unless the ticket is linked to a
 * support call the current user is assigned to (or manages).
 */
export default function SupportCallMemberPanel({ ticketId }: { ticketId: string }) {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const [bundle, setBundle] = useState<MemberBundle | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [etaLocal, setEtaLocal] = useState('');
  const [etaNotes, setEtaNotes] = useState('');

  const [showVisit, setShowVisit] = useState(false);
  const [arrived, setArrived] = useState('');
  const [departed, setDeparted] = useState('');
  const [km, setKm] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [work, setWork] = useState('');
  const [tests, setTests] = useState('');
  const [incomplete, setIncomplete] = useState(false);
  const [incompleteReason, setIncompleteReason] = useState('');
  const [dependency, setDependency] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [lines, setLines] = useState<HardwareLine[]>([]);

  const [summary, setSummary] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = (await scFetch(`/api/support-calls/by-ticket/${ticketId}`, { accessToken: token })) as MemberBundle;
      setBundle(data?.support_call ? data : null);
    } catch {
      setBundle(null);
    }
  }, [ticketId, token]);

  useEffect(() => {
    // Initial fetch of the linked support call (state is set when the request resolves).
    void load();
  }, [load]);

  if (!bundle?.support_call) return null;

  const sc = bundle.support_call;
  const mine = bundle.my_assignment ?? null;
  const isOpen = sc.overall_status === 'open';
  const myContribs = (bundle.contributions ?? []).filter((c) => c.assignment_id === mine?.id);
  const latestContrib = [...myContribs].sort((a, b) => b.revision - a.revision)[0] ?? null;
  const myVisits = (bundle.visits ?? []).filter((v) => !mine || v.assignment_id === mine.id);
  const latestEta = [...(bundle.eta_events ?? [])]
    .filter((e) => !mine || e.assignment_id === mine.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

  const arrivedIso = fromLocalInput(arrived);
  const departedIso = fromLocalInput(departed);
  const labourPreview = minutesBetween(arrivedIso, departedIso);
  const kmNum = km ? Number(km) : null;

  const run = async (key: string, fn: () => Promise<void>, ok?: string) => {
    setBusy(key);
    setError(null);
    setMessage(null);
    try {
      await fn();
      if (ok) setMessage(ok);
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const post = (path: string, body: unknown) =>
    scFetch(`/api/support-calls/${sc.id}/${path}`, { method: 'POST', accessToken: token, body: JSON.stringify(body) });

  const submitVisit = () =>
    run(
      'visit',
      async () => {
        const res = await post('visits', {
          party_type: 'internal',
          arrived_at: arrivedIso,
          departed_at: departedIso,
          travel_km: kmNum,
          diagnosis,
          work_performed: work,
          test_results: tests,
          incomplete,
          incomplete_reason: incompleteReason,
          dependency_notes: dependency,
          expected_follow_up_date: followUp || null,
        });
        const valid = lines.filter((l) => l.description.trim());
        if (valid.length) {
          await post('hardware', {
            visit_id: res.visit.id,
            items: valid.map((l) => ({
              description: l.description,
              make_model: l.make_model,
              quantity: Number(l.quantity) || 1,
              serial_number: l.serial_number,
            })),
          });
        }
        setShowVisit(false);
        setArrived('');
        setDeparted('');
        setKm('');
        setDiagnosis('');
        setWork('');
        setTests('');
        setIncomplete(false);
        setIncompleteReason('');
        setDependency('');
        setFollowUp('');
        setLines([]);
      },
      'Visit logged'
    );

  const canContribute = isOpen && mine && (!latestContrib || latestContrib.status === 'draft' || latestContrib.status === 'returned');

  return (
    <div className="mb-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-cyan-200">🛠️ Support call {sc.support_call_number}</span>
          <Badge tone={priorityTone(sc.priority)}>{sc.priority}</Badge>
          <StageBadge stage={bundle.workflow?.stage ?? sc.workflow_stage} />
          {sc.overall_status !== 'open' && <Badge tone="slate">{sc.overall_status}</Badge>}
        </div>
        {bundle.can_manage && (
          <Link href={`/admin/support-calls/${sc.id}`} className="text-xs text-cyan-300 underline-offset-2 hover:underline">
            Open full support call →
          </Link>
        )}
      </div>
      {bundle.workflow?.next_action && isOpen && (
        <p className="mt-1 text-xs text-slate-400">Next: {bundle.workflow.next_action}</p>
      )}
      <p className="mt-2 line-clamp-3 text-xs text-slate-400">
        {[sc.client, sc.site_name].filter(Boolean).join(' · ')}
      </p>

      {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
      {message && <div className="mt-3"><Notice tone="success">{message}</Notice></div>}

      {!mine && (
        <p className="mt-3 text-xs text-slate-500">You manage this call but are not an assignee, so technician actions are hidden.</p>
      )}

      {mine && isOpen && (
        <div className="mt-4 space-y-4">
          {/* Start work */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            {mine.started_work_at ? (
              <span className="text-sm text-emerald-300">▶ Work started {fmtDateTime(mine.started_work_at)}</span>
            ) : (
              <>
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={busy === 'start'}
                  onClick={() => run('start', async () => { await post('start-work', {}); }, 'Work started — ticket is now open')}
                >
                  {busy === 'start' ? 'Starting…' : 'Start work'}
                </button>
                <span className="text-xs text-slate-500">Logs your start time and opens the ticket if it is still pending.</span>
              </>
            )}
          </div>

          {/* ETA */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
              ETA {latestEta ? `· current ${fmtDateTime(latestEta.new_eta)}` : ''}
            </p>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input type="datetime-local" className={inputCls} value={etaLocal} onChange={(e) => setEtaLocal(e.target.value)} />
              <input className={inputCls} placeholder="Note (optional)" value={etaNotes} onChange={(e) => setEtaNotes(e.target.value)} />
              <button
                type="button"
                className={btnGhost}
                disabled={!etaLocal || busy === 'eta'}
                onClick={() =>
                  run('eta', async () => {
                    await post('eta', { new_eta: fromLocalInput(etaLocal), notes: etaNotes });
                    setEtaLocal('');
                    setEtaNotes('');
                  }, 'ETA updated')
                }
              >
                Update ETA
              </button>
            </div>
          </div>

          {/* Visits */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Visits ({myVisits.length})</p>
              <button type="button" className={btnGhost} onClick={() => setShowVisit((s) => !s)}>
                {showVisit ? 'Cancel' : 'Log a visit'}
              </button>
            </div>

            {myVisits.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-slate-400">
                {myVisits.map((v) => (
                  <li key={v.id} className="rounded-lg bg-slate-900/70 px-2 py-1.5">
                    #{v.visit_number} · {fmtDateTime(v.arrived_at)} → {fmtDateTime(v.departed_at)} ·{' '}
                    {formatLabourDisplay(v.labour_minutes)}
                    {v.travel_amount_zar != null && ` · travel R${Number(v.travel_amount_zar).toFixed(2)}`}
                    {v.incomplete && <span className="ml-1 text-amber-300">· incomplete</span>}
                  </li>
                ))}
              </ul>
            )}

            {showVisit && (
              <div className="mt-3 space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Arrived">
                    <input type="datetime-local" className={inputCls} value={arrived} onChange={(e) => setArrived(e.target.value)} />
                  </Field>
                  <Field label="Departed">
                    <input type="datetime-local" className={inputCls} value={departed} onChange={(e) => setDeparted(e.target.value)} />
                  </Field>
                  <Field label="Travel (km)" hint={`R${INTERNAL_TRAVEL_RATE_ZAR.toFixed(2)}/km`}>
                    <input type="number" min="0" step="0.1" className={inputCls} value={km} onChange={(e) => setKm(e.target.value)} />
                  </Field>
                </div>
                {(labourPreview != null || kmNum) && (
                  <p className="text-xs text-cyan-300">
                    {labourPreview != null && <>Labour: {formatLabourDisplay(labourPreview)}. </>}
                    {kmNum ? <>Travel: R{travelAmountZar(kmNum).toFixed(2)}.</> : null}
                  </p>
                )}
                <Field label="Diagnosis"><textarea className={textareaCls} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} /></Field>
                <Field label="Work performed"><textarea className={textareaCls} value={work} onChange={(e) => setWork(e.target.value)} /></Field>
                <Field label="Test results"><textarea className={textareaCls} value={tests} onChange={(e) => setTests(e.target.value)} /></Field>

                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" checked={incomplete} onChange={(e) => setIncomplete(e.target.checked)} />
                  Visit incomplete / waiting on something
                </label>
                {incomplete && (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Reason (required)"><input className={inputCls} value={incompleteReason} onChange={(e) => setIncompleteReason(e.target.value)} /></Field>
                    <Field label="Dependency notes"><input className={inputCls} value={dependency} onChange={(e) => setDependency(e.target.value)} /></Field>
                    <Field label="Expected follow-up"><input type="date" className={inputCls} value={followUp} onChange={(e) => setFollowUp(e.target.value)} /></Field>
                  </div>
                )}

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs uppercase tracking-[0.14em] text-slate-500">Hardware used / replaced</span>
                    <button type="button" className="text-xs text-cyan-300" onClick={() => setLines((l) => [...l, emptyLine()])}>
                      + Add line
                    </button>
                  </div>
                  {lines.map((l, i) => (
                    <div key={i} className="mb-2 grid gap-2 sm:grid-cols-[2fr_1.5fr_70px_1fr_auto]">
                      <input className={inputCls} placeholder="Description" value={l.description} onChange={(e) => setLines((all) => all.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
                      <input className={inputCls} placeholder="Make / model" value={l.make_model} onChange={(e) => setLines((all) => all.map((x, j) => (j === i ? { ...x, make_model: e.target.value } : x)))} />
                      <input className={inputCls} type="number" min="0" step="1" value={l.quantity} onChange={(e) => setLines((all) => all.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} />
                      <input className={inputCls} placeholder="Serial" value={l.serial_number} onChange={(e) => setLines((all) => all.map((x, j) => (j === i ? { ...x, serial_number: e.target.value } : x)))} />
                      <button type="button" className="text-xs text-rose-300" onClick={() => setLines((all) => all.filter((_, j) => j !== i))}>Remove</button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className={btnPrimary}
                  disabled={busy === 'visit' || !arrivedIso || !departedIso || (incomplete && !incompleteReason.trim())}
                  onClick={() => void submitVisit()}
                >
                  {busy === 'visit' ? 'Saving…' : 'Save visit'}
                </button>
              </div>
            )}
          </div>

          {/* Contribution */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">My contribution</p>
              {latestContrib && (
                <Badge tone={latestContrib.status === 'approved' ? 'emerald' : latestContrib.status === 'returned' ? 'amber' : 'blue'}>
                  {latestContrib.status} · rev {latestContrib.revision}
                </Badge>
              )}
            </div>
            {latestContrib?.status === 'returned' && latestContrib.correction_notes && (
              <div className="mt-2"><Notice tone="error">Returned for correction: {latestContrib.correction_notes}</Notice></div>
            )}
            {latestContrib?.status === 'submitted' && (
              <p className="mt-2 text-xs text-slate-400">Submitted {fmtDateTime(latestContrib.submitted_at)} — awaiting review.</p>
            )}
            {latestContrib?.status === 'approved' && (
              <p className="mt-2 text-xs text-emerald-300">Approved {fmtDateTime(latestContrib.reviewed_at)}.</p>
            )}
            {canContribute && (
              <div className="mt-3 space-y-3">
                <Field label="Summary of your work">
                  <textarea className={textareaCls} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What you found, what you did, what is outstanding…" />
                </Field>
                <label className="flex items-start gap-2 text-sm text-slate-300">
                  <input type="checkbox" className="mt-1" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                  I confirm this contribution (including my visits and hardware) is accurate.
                </label>
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={busy === 'contrib' || !summary.trim() || !confirmed}
                  onClick={() =>
                    run('contrib', async () => {
                      await post('contributions', { summary, confirmed_accurate: true });
                      setSummary('');
                      setConfirmed(false);
                    }, 'Contribution submitted for review')
                  }
                >
                  {busy === 'contrib' ? 'Submitting…' : 'Submit contribution'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
