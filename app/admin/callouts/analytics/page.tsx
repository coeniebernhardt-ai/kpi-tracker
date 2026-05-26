'use client';

import { useEffect, useState } from 'react';
import CalloutsNav from '../CalloutsNav';
import { calloutsApi } from '@/app/lib/callouts/client';

export default function CalloutsAnalyticsPage() {
  const [data, setData] = useState<{
    totals?: Record<string, number>;
    suppliers?: { contractorId: string; name: string; count: number; totalBilled: number; avgCompliance: number }[];
    flagBreakdown?: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    calloutsApi.analytics().then(setData).catch(console.error);
  }, []);

  return (
    <div>
      <CalloutsNav />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Supplier analytics</h1>
        <a
          href={calloutsApi.exportUrl('csv')}
          className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-cyan-400 hover:bg-slate-800"
        >
          Export CSV
        </a>
      </div>

      {data?.suppliers && (
        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-4 py-3">Contractor</th>
                <th className="px-4 py-3">Records</th>
                <th className="px-4 py-3">Total billed</th>
                <th className="px-4 py-3">Avg compliance</th>
              </tr>
            </thead>
            <tbody>
              {data.suppliers.map((s) => (
                <tr key={s.contractorId} className="border-t border-slate-800 text-slate-300">
                  <td className="px-4 py-3">{s.name}</td>
                  <td className="px-4 py-3">{s.count}</td>
                  <td className="px-4 py-3">R {s.totalBilled.toLocaleString()}</td>
                  <td className="px-4 py-3">{s.avgCompliance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data?.flagBreakdown && (
        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-sm font-medium uppercase text-slate-400">Open flags by type</h2>
          <ul className="mt-3 space-y-1 text-sm text-slate-300">
            {Object.entries(data.flagBreakdown).map(([k, v]) => (
              <li key={k}>
                {k}: {v}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
