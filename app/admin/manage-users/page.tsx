'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { getAllProfiles, type Profile } from '../../lib/supabase';

function getAvatarGradient(name: string) {
  const colors = ['from-blue-400 to-blue-600', 'from-blue-500 to-indigo-600', 'from-indigo-400 to-blue-500', 'from-blue-600 to-cyan-500', 'from-cyan-400 to-blue-500'];
  return colors[name.charCodeAt(0) % colors.length];
}

export default function ManageUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getAllProfiles()
      .then((data) => {
        if (!cancelled) {
          setProfiles(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProfiles([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <section className="mb-6">
        <h1 className="text-3xl font-bold text-white">Manage Users</h1>
        <p className="mt-2 text-sm text-slate-400">
          View team members, roles, and admin access from a dedicated page.
        </p>
      </section>

      <section className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
        <h2 className="mb-2 text-sm font-semibold text-amber-400">Password Management</h2>
        <p className="mb-3 text-xs text-slate-300">
          To reset a team member&apos;s password, use the Supabase Auth dashboard.
        </p>
        <a
          href="https://supabase.com/dashboard/project/csbliwkldlglbniqmdin/auth/users"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500/20 px-4 py-2 text-sm text-amber-400 transition-colors hover:bg-amber-500/30"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Open Supabase Auth Dashboard
        </a>
      </section>

      <section className="rounded-2xl border border-slate-700/50 bg-slate-900/70 p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Team Members</h2>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
            {profiles.length} total
          </span>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 px-4 py-10 text-center text-slate-400">
            Loading team members...
          </div>
        ) : (
          <div className="space-y-3">
            {profiles.map((profile) => (
              <div key={profile.id} className="flex flex-col gap-4 rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  {profile.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${getAvatarGradient(profile.full_name)} text-sm font-bold text-white`}>
                      {profile.avatar}
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium text-white">{profile.full_name}</p>
                    <p className="text-xs text-slate-500">{profile.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-300">{profile.role}</span>
                  {profile.is_admin && (
                    <span className="rounded bg-blue-500/20 px-2 py-1 text-xs text-blue-400">Admin</span>
                  )}
                  {!profile.is_active && (
                    <span className="rounded bg-rose-500/20 px-2 py-1 text-xs text-rose-300">Inactive</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-slate-700/50 bg-slate-900/70 p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-300">Add New Team Member</h2>
        <p className="text-xs text-slate-400">New team members can sign up at:</p>
        <code className="mt-3 block rounded bg-slate-950 px-3 py-2 text-xs text-cyan-400 break-all">
          https://kpi-tracker-six.vercel.app/login
        </code>
        <p className="mt-2 text-xs text-slate-500">
          They can use the sign-up flow, then you can update roles in Supabase if needed.
        </p>
      </section>
    </main>
  );
}
