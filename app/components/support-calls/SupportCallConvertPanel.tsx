'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { scFetch, type ScFetchError } from '../../lib/support-calls/client';
import type { Ticket } from '../../lib/supabase';
import { Badge, Field, Notice, StageBadge, btnGhost, btnPrimary, errorMessage, inputCls } from './sc-ui';

type Member = { id: string; full_name: string | null; is_hto?: boolean; is_admin?: boolean };
type Linked = { id: string; support_call_number: string; overall_status: string; workflow_stage: string };

const REPORT_METHODS = ['Email', 'Telephone', 'WhatsApp', 'In person', 'Other'];

function priorityFromSeverity(s?: string): string {
  switch ((s || '').toUpperCase()) {
    case 'URGENT':
      return 'Critical';
    case 'HIGH':
      return 'High';
    case 'LOW':
      return 'Low';
    default:
      return 'Medium';
  }
}

/** Admin / HTO only: link a ticket to a support call (the ticket is preserved, never duplicated). */
export default function SupportCallConvertPanel({ ticketId, ticket }: { ticketId: string; ticket?: Partial<Ticket> | null }) {
  const router = useRouter();
  const { session, canManageSupportCalls, isHto, user } = useAuth();
  const token = session?.access_token ?? null;

  const [linked, setLinked] = useState<Linked | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dupHint, setDupHint] = useState<string | null>(null);

  const [priority, setPriority] = useState(priorityFromSeverity(ticket?.severity));
  const [reportMethod, setReportMethod] = useState('Email');
  const [htoId, setHtoId] = useState('');
  const [ackReason, setAckReason] = useState('');
  const [htos, setHtos] = useState<Member[]>([]);

  const load = useCallback(async () => {
    if (!token || !canManageSupportCalls) return;
    try {
      const data = await scFetch(`/api/support-calls/by-ticket/${ticketId}`, { accessToken: token });
      setLinked(data?.support_call ?? null);
    } catch {
      setLinked(null);
    } finally {
      setLoaded(true);
    }
  }, [ticketId, token, canManageSupportCalls]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!open || !token || isHto || htos.length) return;
    scFetch('/api/support-calls?include=members&limit=1', { accessToken: token })
      .then((d) => setHtos(((d.members || []) as Member[]).filter((m) => m.is_hto)))
      .catch(() => undefined);
  }, [open, token, isHto, htos.length]);

  if (!canManageSupportCalls || !loaded) return null;

  if (linked) {
    return (
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-3">
        <span className="text-xs text-cyan-200">🛠️ Linked support call</span>
        <Link href={`/admin/support-calls/${linked.id}`} className="text-sm font-medium text-cyan-300 hover:underline">
          {linked.support_call_number}
        </Link>
        <StageBadge stage={linked.workflow_stage} />
        {linked.overall_status !== 'open' && <Badge tone="slate">{linked.overall_status}</Badge>}
      </div>
    );
  }

  if (ticket?.status === 'closed') return null;

  const convert = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await scFetch('/api/support-calls/from-ticket', {
        method: 'POST',
        accessToken: token,
        body: JSON.stringify({
          ticket_id: ticketId,
          priority,
          report_method: reportMethod,
          hto_owner_id: isHto ? user?.id : htoId || undefined,
          duplicate_ack_reason: ackReason || undefined,
        }),
      });
      router.push(`/admin/support-calls/${res.support_call.id}`);
    } catch (e) {
      const err = e as ScFetchError;
      if ((err.data as { code?: string } | undefined)?.code === 'POSSIBLE_DUPLICATE') {
        setDupHint(err.message);
      }
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-white">🛠️ Support call</p>
          <p className="text-xs text-slate-500">Convert this ticket into a tracked support call. The ticket is kept as-is.</p>
        </div>
        <button type="button" className={btnGhost} onClick={() => setOpen((o) => !o)}>
          {open ? 'Close' : 'Convert to support call'}
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Priority">
              <select className={inputCls} value={priority} onChange={(e) => setPriority(e.target.value)}>
                {['Critical', 'High', 'Medium', 'Low'].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </Field>
            <Field label="Reported via">
              <select className={inputCls} value={reportMethod} onChange={(e) => setReportMethod(e.target.value)}>
                {REPORT_METHODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </Field>
            {!isHto && (
              <Field label="HTO owner">
                <select className={inputCls} value={htoId} onChange={(e) => setHtoId(e.target.value)}>
                  <option value="">Select HTO…</option>
                  {htos.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.full_name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>

          {dupHint && (
            <div className="space-y-2">
              <Notice tone="info">{dupHint}</Notice>
              <Field label="Why is this not a duplicate?">
                <input className={inputCls} value={ackReason} onChange={(e) => setAckReason(e.target.value)} />
              </Field>
            </div>
          )}
          {error && <Notice tone="error">{error}</Notice>}

          <button
            type="button"
            className={btnPrimary}
            disabled={busy || (!isHto && !htoId) || (Boolean(dupHint) && !ackReason.trim())}
            onClick={() => void convert()}
          >
            {busy ? 'Converting…' : 'Create support call from ticket'}
          </button>
        </div>
      )}
    </div>
  );
}
