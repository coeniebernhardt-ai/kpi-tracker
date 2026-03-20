'use client';

import { useCallback, useEffect, useState } from 'react';
import ExportsPanel from '../../components/ExportsPanel';
import { getAllProfiles, supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function ReportsPage() {
  const { isAdmin } = useAuth();
  const [memberOptions, setMemberOptions] = useState<{ id: string; full_name: string }[]>([]);

  useEffect(() => {
    let cancelled = false;

    getAllProfiles()
      .then((profiles) => {
        if (cancelled) return;
        setMemberOptions(
          profiles.map((profile) => ({
            id: profile.id,
            full_name: profile.full_name,
          }))
        );
      })
      .catch(() => {
        if (!cancelled) {
          setMemberOptions([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
      <section className="mb-6">
        <h1 className="text-3xl font-bold text-white">Reports</h1>
        <p className="mt-2 text-sm text-slate-400">
          Export ticket, site, and travel data from a full admin reports page.
        </p>
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
