'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { getAllProfiles, supabase, type Profile } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

type MemberStat = {
  user_id: string | null;
  open: number;
  closed: number;
  handled: number;
  avgResponseMinutes: number;
};

function getAvatarGradient(name: string) {
  const colors = ['from-blue-400 to-blue-600', 'from-blue-500 to-indigo-600', 'from-indigo-400 to-blue-500', 'from-blue-600 to-cyan-500', 'from-cyan-400 to-blue-500'];
  return colors[name.charCodeAt(0) % colors.length];
}

export default function AdminTeamPage() {
  const { session } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [memberStats, setMemberStats] = useState<MemberStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const [profilesData, metricsResponse] = await Promise.all([
          getAllProfiles(),
          fetch('/api/admin/metrics', {
            headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
          }).then(async (response) => {
            if (!response.ok) return null;
            return response.json();
          }).catch(() => null),
        ]);

        if (cancelled) return;

        setProfiles(profilesData);
        setMemberStats(Array.isArray(metricsResponse?.memberStats) ? metricsResponse.memberStats : []);
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

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <section className="mb-6">
        <h1 className="text-3xl font-bold text-white">Team</h1>
        <p className="mt-2 text-sm text-slate-400">
          Team performance and profile status live here instead of inside the dashboard.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-700/50 bg-slate-900/70 p-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Team Members</h2>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
            {profiles.length} members
          </span>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 px-4 py-10 text-center text-slate-400">
            Loading team data...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {profiles.map((profile) => {
              const stats = memberStats.find((member) => member.user_id === profile.id);
              const openCount = stats?.open ?? 0;
              const closedCount = stats?.closed ?? 0;
              const handledCount = stats?.handled ?? 0;
              const avgResponse = stats?.avgResponseMinutes ?? 0;

              return (
                <div key={profile.id} className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5">
                  <div className="mb-4 flex items-center gap-3">
                    {profile.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt={profile.full_name}
                        width={48}
                        height={48}
                        className="h-12 w-12 rounded-xl object-cover"
                      />
                    ) : (
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${getAvatarGradient(profile.full_name)} font-bold text-white`}>
                        {profile.avatar}
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-white">{profile.full_name}</p>
                      <p className="truncate text-sm text-slate-400">{profile.role}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-slate-700/50 bg-slate-900/70 p-3">
                      <p className="text-xs text-slate-500">Open</p>
                      <p className="mt-1 font-semibold text-blue-400">{openCount}</p>
                    </div>
                    <div className="rounded-xl border border-slate-700/50 bg-slate-900/70 p-3">
                      <p className="text-xs text-slate-500">Closed</p>
                      <p className="mt-1 font-semibold text-blue-300">{closedCount}</p>
                    </div>
                    <div className="rounded-xl border border-slate-700/50 bg-slate-900/70 p-3">
                      <p className="text-xs text-slate-500">Handled</p>
                      <p className="mt-1 font-semibold text-white">{handledCount}</p>
                    </div>
                    <div className="rounded-xl border border-slate-700/50 bg-slate-900/70 p-3">
                      <p className="text-xs text-slate-500">Avg Response</p>
                      <p className="mt-1 font-semibold text-white">{avgResponse > 0 ? `${avgResponse}m` : 'N/A'}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    {profile.is_admin && (
                      <span className="rounded bg-blue-500/20 px-2 py-1 text-xs text-blue-400">Admin</span>
                    )}
                    {!profile.is_active && (
                      <span className="rounded bg-rose-500/20 px-2 py-1 text-xs text-rose-300">Inactive</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
