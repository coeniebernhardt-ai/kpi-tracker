'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CalloutsNav from '../CalloutsNav';
import { calloutsApi } from '@/app/lib/callouts/client';

export default function CalloutsRecordsClient({ statusFilter }: { statusFilter: string }) {
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [q, setQ] = useState('');
  const [searchMode, setSearchMode] = useState<'keyword' | 'semantic'>('keyword');

  const load = () => {
    if (q.trim()) {
      calloutsApi.search(q, searchMode).then((r) => setRecords(r.records ?? [])).catch(() => setRecords([]));
      return;
    }
    const p = new URLSearchParams();
    if (statusFilter) p.set('status', statusFilter);
    calloutsApi.records(p.toString()).then((r) => setRecords(r.records ?? []));
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  return (
    <div>
      <CalloutsNav />
      <h1 className="mb-6 text-2xl font-bold text-white">Callout records</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search job card, site, summary…"
          className="min-w-[200px] flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
        <select
          value={searchMode}
          onChange={(e) => setSearchMode(e.target.value as 'keyword' | 'semantic')}
          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        >
          <option value="keyword">Keyword</option>
          <option value="semantic">Semantic</option>
        </select>
        <button type="button" onClick={load} className="rounded-xl bg-cyan-600 px-4 py-2 text-sm text-white">
          Search
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-4 py-3">Job card</th>
              <th className="px-4 py-3">Site</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Compliance</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id as string} className="border-t border-slate-800 text-slate-300">
                <td className="px-4 py-3">{String(r.primary_job_card_number ?? '—')}</td>
                <td className="px-4 py-3">{String(r.primary_site_name ?? '—')}</td>
                <td className="px-4 py-3">
                  <span className="rounded-lg bg-slate-800 px-2 py-0.5 text-xs">{String(r.status)}</span>
                </td>
                <td className="px-4 py-3">{r.compliance_score != null ? String(r.compliance_score) : '—'}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/callouts/records/${r.id}`} className="text-cyan-400 hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!records.length && <p className="p-6 text-center text-slate-500">No records yet.</p>}
      </div>
    </div>
  );
}
