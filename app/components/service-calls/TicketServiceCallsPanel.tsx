'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { scFetch } from '@/app/lib/service-calls/client';
import { TECHNICAL_STATUS_LABELS } from '@/app/lib/service-calls/transitions';
import type { ServiceCall, TechnicalStatus } from '@/app/lib/service-calls/types';

type Props = {
  ticketId: string;
  ticket: {
    client?: string;
    issue?: string;
    estate_or_building?: string | null;
    cml_location?: string | null;
    location?: string | null;
    severity?: string | null;
    site_name?: string | null;
  };
  basePath: '/admin/service-calls' | '/dashboard/service-calls';
};

export default function TicketServiceCallsPanel({ ticketId, ticket, basePath }: Props) {
  const { session } = useAuth();
  const token = session?.access_token;
  const [calls, setCalls] = useState<ServiceCall[]>([]);
  const [canClose, setCanClose] = useState(true);
  const [blockers, setBlockers] = useState<{ service_call_number: string; reason: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await scFetch(`/api/service-calls/by-ticket/${ticketId}`, { accessToken: token });
      setCalls(data.serviceCalls || []);
      setCanClose(data.canCloseTicket !== false);
      setBlockers(data.closeBlockers || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load service calls');
    } finally {
      setLoading(false);
    }
  }, [ticketId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const createFromTicket = async () => {
    setCreating(true);
    setError(null);
    try {
      const data = await scFetch('/api/service-calls', {
        method: 'POST',
        accessToken: token,
        body: JSON.stringify({
          ticket_id: ticketId,
          title: (ticket.issue || 'Service call').slice(0, 120),
          description: ticket.issue || undefined,
          client: ticket.client || undefined,
          site_name: ticket.site_name || undefined,
          estate_or_building: ticket.estate_or_building || undefined,
          cml_location: ticket.cml_location || undefined,
          location: ticket.location === 'on-site' || ticket.location === 'remote' ? ticket.location : undefined,
          priority:
            ticket.severity === 'LOW' ||
            ticket.severity === 'MEDIUM' ||
            ticket.severity === 'HIGH' ||
            ticket.severity === 'URGENT'
              ? ticket.severity
              : 'MEDIUM',
        }),
      });
      window.location.href = `${basePath}/${data.serviceCall.id}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
      setCreating(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-900/50 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-white">Service Calls</h4>
        <button
          type="button"
          disabled={creating}
          onClick={() => void createFromTicket()}
          className="rounded-lg bg-cyan-500/20 px-2.5 py-1 text-xs font-medium text-cyan-300 ring-1 ring-cyan-500/30 disabled:opacity-50"
        >
          {creating ? 'Creating…' : '+ Create service call'}
        </button>
      </div>
      {error && <p className="mb-2 text-xs text-rose-300">{error}</p>}
      {loading ? (
        <p className="text-xs text-slate-500">Loading…</p>
      ) : calls.length === 0 ? (
        <p className="text-xs text-slate-500">No service calls linked to this ticket.</p>
      ) : (
        <ul className="space-y-2">
          {calls.map((sc) => (
            <li key={sc.id} className="flex items-center justify-between gap-2 text-sm">
              <div>
                <Link href={`${basePath}/${sc.id}`} className="font-medium text-cyan-300 hover:underline">
                  {sc.service_call_number}
                </Link>
                <span className="ml-2 text-slate-400">
                  {TECHNICAL_STATUS_LABELS[sc.technical_status as TechnicalStatus] || sc.technical_status}
                </span>
              </div>
              <span className="text-xs text-slate-500">{sc.priority}</span>
            </li>
          ))}
        </ul>
      )}
      {!canClose && blockers.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          <p className="font-medium">Ticket cannot be closed yet</p>
          <ul className="mt-1 list-disc pl-4">
            {blockers.map((b) => (
              <li key={b.service_call_number}>{b.reason}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function useTicketCanClose(ticketId: string | null): {
  canClose: boolean;
  blockers: { service_call_number: string; reason: string }[];
  refresh: () => Promise<void>;
} {
  const { session } = useAuth();
  const [canClose, setCanClose] = useState(true);
  const [blockers, setBlockers] = useState<{ service_call_number: string; reason: string }[]>([]);

  const refresh = useCallback(async () => {
    if (!ticketId) {
      setCanClose(true);
      setBlockers([]);
      return;
    }
    try {
      const data = await scFetch(`/api/service-calls/by-ticket/${ticketId}`, {
        accessToken: session?.access_token,
      });
      setCanClose(data.canCloseTicket !== false);
      setBlockers(data.closeBlockers || []);
    } catch {
      setCanClose(true);
      setBlockers([]);
    }
  }, [ticketId, session?.access_token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { canClose, blockers, refresh };
}
