'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useAdminData } from '../AdminDataProvider';
import { AdminPanel, EmptyState } from '../admin-ui';
import { useAuth } from '../../context/AuthContext';
import { scFetch } from '../../lib/support-calls/client';

function getAvatarGradient(name: string) {
  const colors = ['from-blue-400 to-blue-600', 'from-blue-500 to-cyan-500', 'from-cyan-400 to-blue-500', 'from-blue-600 to-cyan-500', 'from-cyan-400 to-blue-500'];
  return colors[name.charCodeAt(0) % colors.length];
}

export default function ManageUsersPage() {
  const { profiles, loading, setProfiles } = useAdminData();
  const { session, isAdmin } = useAuth();
  const [query, setQuery] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const filteredProfiles = useMemo(
    () =>
      profiles.filter((profile) =>
        `${profile.full_name} ${profile.email} ${profile.role}`.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [profiles, query]
  );

  const adminCount = profiles.filter((profile) => profile.is_admin).length;
  const htoCount = profiles.filter((profile) => profile.is_hto).length;
  const activeCount = profiles.filter((profile) => profile.is_active).length;

  const toggleHto = async (userId: string, next: boolean) => {
    setTogglingId(userId);
    setToggleError(null);
    try {
      await scFetch('/api/admin/toggle-hto', {
        method: 'PATCH',
        accessToken: session?.access_token,
        body: JSON.stringify({ userId, is_hto: next }),
      });
      setProfiles((current) => current.map((p) => (p.id === userId ? { ...p, is_hto: next } : p)));
    } catch (e) {
      setToggleError(e instanceof Error ? e.message : 'Could not update HTO status');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <section className="mb-8">
        <h1 className="text-3xl font-semibold text-white">Manage Users</h1>
        <p className="mt-2 text-sm text-slate-400">
          A structured admin view of user roles, account status, and Supabase Auth handoff guidance.
        </p>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Total users</p>
          <p className="mt-4 text-3xl font-semibold text-white">{profiles.length}</p>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Admins</p>
          <p className="mt-4 text-3xl font-semibold text-blue-300">{adminCount}</p>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">HTOs</p>
          <p className="mt-4 text-3xl font-semibold text-cyan-300">{htoCount}</p>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Active accounts</p>
          <p className="mt-4 text-3xl font-semibold text-cyan-300">{activeCount}</p>
        </div>
      </section>

      <section className="mb-6 rounded-3xl border border-amber-500/20 bg-amber-500/10 p-5">
        <h2 className="text-sm font-semibold text-amber-300">Supabase Auth handoff</h2>
        <p className="mt-2 text-sm text-slate-300">
          Direct password changes still belong in Supabase Auth. Use the dashboard for password resets or emergency account access changes.
        </p>
        <a
          href="https://supabase.com/dashboard/project/csbliwkldlglbniqmdin/auth/users"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex rounded-2xl bg-amber-500/20 px-4 py-2.5 text-sm font-medium text-amber-300"
        >
          Open Supabase Auth Dashboard
        </a>
      </section>

      <AdminPanel title="User directory">
        <div className="mb-4">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, email, or role"
            className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
          />
        </div>

        {toggleError && (
          <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">{toggleError}</div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/70 px-4 py-10 text-center text-slate-400">
            Loading users...
          </div>
        ) : filteredProfiles.length === 0 ? (
          <EmptyState title="No users found" description="Adjust the search term to find another account." />
        ) : (
          <div className="space-y-3">
            {filteredProfiles.map((profile) => (
              <div key={profile.id} className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-950/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  {profile.avatar_url ? (
                    <Image src={profile.avatar_url} alt={profile.full_name} width={48} height={48} className="h-12 w-12 rounded-2xl object-cover" />
                  ) : (
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${getAvatarGradient(profile.full_name)} text-base font-bold text-white`}>
                      {profile.avatar}
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium text-white">{profile.full_name}</p>
                    <p className="text-xs text-slate-500">{profile.email}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">{profile.role}</span>
                  {profile.is_admin && <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs text-blue-300">Admin</span>}
                  {profile.is_hto && <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-xs text-cyan-300">HTO</span>}
                  {!profile.is_active && <span className="rounded-full bg-rose-500/20 px-3 py-1 text-xs text-rose-300">Inactive</span>}
                  {isAdmin && (
                    <button
                      type="button"
                      disabled={togglingId === profile.id || (!profile.is_hto && !profile.is_active)}
                      onClick={() => void toggleHto(profile.id, !profile.is_hto)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        profile.is_hto
                          ? 'border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                          : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20'
                      }`}
                    >
                      {togglingId === profile.id ? 'Saving…' : profile.is_hto ? 'Remove HTO' : 'Make HTO'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminPanel>
    </main>
  );
}
