'use client';

import { useEffect, useState } from 'react';
import { getAllProfiles, type KpiMetrics } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

type MemberStat = {
  user_id: string | null;
  open: number;
  closed: number;
  handled: number;
  avgResponseMinutes: number;
};

export default function AdminDataMetricsPage() {
  const { session } = useAuth();
  const [metrics, setMetrics] = useState<KpiMetrics | null>(null);
  const [memberStats, setMemberStats] = useState<MemberStat[]>([]);
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const [metricsResponse, profiles] = await Promise.all([
          fetch('/api/admin/metrics', {
            headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
          }).then(async (response) => {
            if (!response.ok) return null;
            return response.json();
          }).catch(() => null),
          getAllProfiles(),
        ]);

        if (cancelled) return;

        setMetrics(metricsResponse ? {
          total_tickets: metricsResponse.totalTickets ?? 0,
          open_tickets: metricsResponse.totalOpen ?? 0,
          closed_tickets: metricsResponse.totalClosed ?? 0,
          pending_tickets: metricsResponse.totalPending ?? 0,
          avg_response_time_minutes: metricsResponse.overallAvgResponseTime ?? null,
          avg_no_deps: metricsResponse.avgResponseTimeNoDependencies ?? null,
          avg_with_deps: metricsResponse.avgResponseTimeWithDependencies ?? null,
        } : null);

        setMemberStats(Array.isArray(metricsResponse?.memberStats) ? metricsResponse.memberStats : []);
        setMemberNames(
          profiles.reduce<Record<string, string>>((acc, profile) => {
            acc[profile.id] = profile.full_name;
            return acc;
          }, {})
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  const cards = [
    { label: 'Total Tickets', value: metrics?.total_tickets ?? 0, tone: 'text-white border-slate-700/50 bg-slate-800/50' },
    { label: 'Open', value: metrics?.open_tickets ?? 0, tone: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
    { label: 'Closed', value: metrics?.closed_tickets ?? 0, tone: 'text-blue-300 border-blue-500/30 bg-blue-500/10' },
    { label: 'Pending', value: metrics?.pending_tickets ?? 0, tone: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
    { label: 'Avg Response Time', value: metrics?.avg_response_time_minutes ?? '—', tone: 'text-blue-400 border-blue-500/30 bg-blue-500/10', suffix: metrics?.avg_response_time_minutes ? 'minutes' : 'No data' },
    { label: 'Avg (No Deps)', value: metrics?.avg_no_deps ?? '—', tone: 'text-white border-slate-700/50 bg-slate-800/50', suffix: metrics?.avg_no_deps ? 'min' : 'No data' },
    { label: 'Avg (With Deps)', value: metrics?.avg_with_deps ?? '—', tone: 'text-white border-slate-700/50 bg-slate-800/50', suffix: metrics?.avg_with_deps ? 'min' : 'No data' },
  ];

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <section className="mb-6">
        <h1 className="text-3xl font-bold text-white">Data Metrics</h1>
        <p className="mt-2 text-sm text-slate-400">
          KPI totals and per-member response metrics are separated into their own page.
        </p>
      </section>

      {loading ? (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/70 px-4 py-10 text-center text-slate-400">
          Loading metrics...
        </div>
      ) : (
        <>
          <section className="mb-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <div key={card.label} className={`rounded-2xl border p-4 ${card.tone}`}>
                <p className="text-xs opacity-70">{card.label}</p>
                <p className="mt-2 text-3xl font-bold">{card.value}</p>
                {card.suffix && (
                  <p className="mt-1 text-xs opacity-70">{card.suffix}</p>
                )}
              </div>
            ))}
          </section>

          <section className="rounded-2xl border border-slate-700/50 bg-slate-900/70 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Member Metrics</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-slate-500">
                    <th className="px-3 py-3 font-medium">Member</th>
                    <th className="px-3 py-3 font-medium">Open</th>
                    <th className="px-3 py-3 font-medium">Closed</th>
                    <th className="px-3 py-3 font-medium">Handled</th>
                    <th className="px-3 py-3 font-medium">Avg Response</th>
                  </tr>
                </thead>
                <tbody>
                  {memberStats.map((member) => (
                    <tr key={member.user_id ?? 'unknown'} className="border-b border-slate-800/70 text-slate-300">
                      <td className="px-3 py-3">{member.user_id ? (memberNames[member.user_id] ?? 'Unknown member') : 'Unassigned'}</td>
                      <td className="px-3 py-3">{member.open}</td>
                      <td className="px-3 py-3">{member.closed}</td>
                      <td className="px-3 py-3">{member.handled}</td>
                      <td className="px-3 py-3">{member.avgResponseMinutes > 0 ? `${member.avgResponseMinutes}m` : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
