'use client';

import { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { scFetch } from '@/app/lib/support-calls/client';

export default function SupportCallsReportsPanel() {
  const { session, canManageSupportCalls } = useAuth();
  const token = session?.access_token;
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [scId, setScId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canManageSupportCalls) return null;

  const downloadBlob = async (url: string, fallbackName: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Download failed (${res.status})`);
      }
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition') || '';
      const match = /filename="([^"]+)"/.exec(cd);
      const name = match?.[1] || fallbackName;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-8 rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Support Calls reports</h2>
        <p className="mt-1 text-sm text-slate-400">
          Admin and HTO only. Register exports and per-call document packages.
        </p>
      </div>
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </div>
      )}
      <div className="flex flex-wrap gap-3 items-end">
        <label className="text-xs text-slate-400">
          From
          <input
            type="date"
            className="mt-1 block rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="text-xs text-slate-400">
          To
          <input
            type="date"
            className="mt-1 block rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={busy}
          className="rounded-xl bg-cyan-500/20 px-4 py-2 text-sm text-cyan-200 disabled:opacity-50"
          onClick={() =>
            void downloadBlob(
              `/api/support-calls/reports/register?format=xlsx&from=${from}&to=${to}`,
              'Support-Calls-Register.xlsx'
            )
          }
        >
          Register (Excel)
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-xl bg-slate-800 px-4 py-2 text-sm text-slate-200 disabled:opacity-50"
          onClick={() =>
            void downloadBlob(
              `/api/support-calls/reports/register?format=csv&from=${from}&to=${to}`,
              'Support-Calls-Register.csv'
            )
          }
        >
          Register (CSV)
        </button>
      </div>
      <div className="flex flex-wrap gap-3 items-end">
        <label className="text-xs text-slate-400 flex-1 min-w-[220px]">
          Support Call ID (UUID)
          <input
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            value={scId}
            onChange={(e) => setScId(e.target.value)}
            placeholder="Paste support call UUID"
          />
        </label>
        <button
          type="button"
          disabled={busy || !scId.trim()}
          className="rounded-xl bg-slate-800 px-4 py-2 text-sm text-slate-200 disabled:opacity-50"
          onClick={() =>
            void downloadBlob(`/api/support-calls/reports/${scId.trim()}/zip`, 'documents.zip')
          }
        >
          Documents ZIP
        </button>
        <button
          type="button"
          disabled={busy || !scId.trim()}
          className="rounded-xl bg-slate-800 px-4 py-2 text-sm text-slate-200 disabled:opacity-50"
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await scFetch(`/api/support-calls/${scId.trim()}/job-card`, {
                method: 'POST',
                accessToken: token,
                body: JSON.stringify({ regenerate: false }),
              });
              window.open(`/admin/support-calls/${scId.trim()}`, '_blank');
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Open failed');
            } finally {
              setBusy(false);
            }
          }}
        >
          Open call detail
        </button>
      </div>
    </section>
  );
}
