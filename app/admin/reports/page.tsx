'use client';

import { useCallback, useMemo } from 'react';
import { useAdminData } from '../AdminDataProvider';
import ExportsPanel from '../../components/ExportsPanel';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function ReportsPage() {
  const { isAdmin } = useAuth();
  const { profiles } = useAdminData();
  const memberOptions = useMemo(
    () =>
      profiles.map((profile) => ({
        id: profile.id,
        full_name: profile.full_name,
      })),
    [profiles]
  );

  const getAuthHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: HeadersInit = {};
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
    return headers;
  }, []);

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <section className="mb-8">
        <h1 className="text-3xl font-semibold text-white">Reports</h1>
        <p className="mt-2 text-sm text-slate-400">
          Export the platform&apos;s operational data from a dedicated dashboard-style reporting centre.
        </p>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        {[
          ['All Data Export', 'Cross-module workbook'],
          ['Ticket Report', 'Ticket operations and SLA data'],
          ['Travel Log Report', 'Distance and reimbursement'],
          ['Site Report', 'Rollout and project records'],
        ].map(([title, description]) => (
          <div key={title} className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="mt-2 text-sm text-slate-500">{description}</p>
          </div>
        ))}
      </section>

      <ExportsPanel
        variant="page"
        isAdmin={Boolean(isAdmin)}
        onClose={() => {}}
        getAuthHeaders={getAuthHeaders}
        memberOptions={memberOptions}
      />
    </main>
  );
}
