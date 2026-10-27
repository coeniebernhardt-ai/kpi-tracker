'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { scFetch } from '@/app/lib/service-calls/client';
import {
  INVOICING_STATUS_LABELS,
  TECHNICAL_STATUS_LABELS,
} from '@/app/lib/service-calls/transitions';
import type { ServiceCall, ServiceCallPriority, TechnicalStatus } from '@/app/lib/service-calls/types';
import { getAllProfiles, type Profile } from '@/app/lib/supabase';

type Props = {
  basePath: '/admin/service-calls' | '/dashboard/service-calls';
  variant: 'admin' | 'member';
};

export default function ServiceCallsApp({ basePath, variant }: Props) {
  const { session, isAdmin } = useAuth();
  const token = session?.access_token;
  const [items, setItems] = useState<ServiceCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [queue, setQueue] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    client: '',
    site_name: '',
    priority: 'MEDIUM' as ServiceCallPriority,
    location: '' as '' | 'on-site' | 'remote',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (status) params.set('technical_status', status);
      if (queue) params.set('queue', queue);
      const data = await scFetch(`/api/service-calls?${params}`, { accessToken: token });
      setItems(data.serviceCalls || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [q, status, queue, token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void getAllProfiles().then(setProfiles).catch(() => setProfiles([]));
  }, []);

  const queues = useMemo(
    () => [
      { key: '', label: 'All' },
      { key: 'unassigned', label: 'Unassigned' },
      { key: 'awaiting_acceptance', label: 'Awaiting acceptance' },
      { key: 'job_card_correction', label: 'Job card correction' },
      { key: 'ready_to_invoice', label: 'Ready to invoice' },
    ],
    []
  );

  const create = async () => {
    if (!form.title.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const data = await scFetch('/api/service-calls', {
        method: 'POST',
        accessToken: token,
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          client: form.client.trim() || undefined,
          site_name: form.site_name.trim() || undefined,
          priority: form.priority,
          location: form.location || undefined,
        }),
      });
      setShowCreate(false);
      setForm({ title: '', description: '', client: '', site_name: '', priority: 'MEDIUM', location: '' });
      window.location.href = `${basePath}/${data.serviceCall.id}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Service Calls</h1>
          <p className="mt-1 text-sm text-slate-400">
            {variant === 'admin'
              ? 'Organisation-wide service calls, triage, and invoicing pipeline.'
              : 'Your service calls — create, work, and complete the full lifecycle.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-xl bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-300 ring-1 ring-cyan-500/30 hover:bg-cyan-500/30"
        >
          + Create service call
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {queues.map((item) => (
          <button
            key={item.key || 'all'}
            type="button"
            onClick={() => setQueue(item.key)}
            className={`rounded-xl px-3 py-1.5 text-xs font-medium ${
              queue === item.key
                ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_200px]">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search number, title, client, site…"
          className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white"
        >
          <option value="">All technical statuses</option>
          {Object.entries(TECHNICAL_STATUS_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-6 py-12 text-center text-slate-400">
          No service calls match these filters.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Call</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Technical</th>
                <th className="px-4 py-3">Invoicing</th>
                <th className="px-4 py-3">Technician</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/40">
              {items.map((sc) => {
                const tech = profiles.find((p) => p.id === sc.assigned_technician_id);
                return (
                  <tr key={sc.id} className="hover:bg-slate-900/50">
                    <td className="px-4 py-3">
                      <Link href={`${basePath}/${sc.id}`} className="font-medium text-cyan-300 hover:underline">
                        {sc.service_call_number}
                      </Link>
                      <div className="text-slate-300">{sc.title}</div>
                      <div className="text-xs text-slate-500">
                        {[sc.client, sc.site_name].filter(Boolean).join(' · ') || '—'}
                        {sc.ticket_id ? ' · Linked ticket' : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{sc.priority}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {TECHNICAL_STATUS_LABELS[sc.technical_status as TechnicalStatus] || sc.technical_status}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {INVOICING_STATUS_LABELS[sc.invoicing_status] || sc.invoicing_status}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{tech?.full_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(sc.updated_at).toLocaleString('en-ZA')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-white">Create service call</h2>
            <p className="mt-1 text-xs text-slate-500">Standalone call — you can link a ticket later.</p>
            <div className="mt-4 space-y-3">
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                placeholder="Title *"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
              <textarea
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                placeholder="Description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  placeholder="Client"
                  value={form.client}
                  onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))}
                />
                <input
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  placeholder="Site"
                  value={form.site_name}
                  onChange={(e) => setForm((f) => ({ ...f, site_name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as ServiceCallPriority }))}
                >
                  {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  value={form.location}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, location: e.target.value as '' | 'on-site' | 'remote' }))
                  }
                >
                  <option value="">Location</option>
                  <option value="on-site">On-site</option>
                  <option value="remote">Remote</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-xl px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={creating || !form.title.trim()}
                onClick={() => void create()}
                className="rounded-xl bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-300 ring-1 ring-cyan-500/30 disabled:opacity-50"
              >
                {creating ? 'Creating…' : isAdmin ? 'Create' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
