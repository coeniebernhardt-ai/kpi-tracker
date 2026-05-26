'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useAdminData } from '../AdminDataProvider';
import { AdminPanel, EmptyState } from '../admin-ui';

function getAvatarGradient(name: string) {
  const colors = ['from-blue-400 to-blue-600', 'from-blue-500 to-cyan-500', 'from-cyan-400 to-blue-500', 'from-blue-600 to-cyan-500', 'from-cyan-400 to-blue-500'];
  return colors[name.charCodeAt(0) % colors.length];
}

export default function ManageUsersPage() {
  const { profiles, loading } = useAdminData();
  const [query, setQuery] = useState('');

  const filteredProfiles = useMemo(
    () =>
      profiles.filter((profile) =>
        `${profile.full_name} ${profile.email} ${profile.role}`.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [profiles, query]
  );

  const adminCount = profiles.filter((profile) => profile.is_admin).length;
  const activeCount = profiles.filter((profile) => profile.is_active).length;

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <section className="mb-8">
        <h1 className="text-3xl font-semibold text-white">Manage Users</h1>
        <p className="mt-2 text-sm text-slate-400">
          A structured admin view of user roles, account status, and Supabase Auth handoff guidance.
        </p>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Total users</p>
          <p className="mt-4 text-3xl font-semibold text-white">{profiles.length}</p>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Admins</p>
          <p className="mt-4 text-3xl font-semibold text-blue-300">{adminCount}</p>
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
                  {!profile.is_active && <span className="rounded-full bg-rose-500/20 px-3 py-1 text-xs text-rose-300">Inactive</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminPanel>
    </main>
  );
}
