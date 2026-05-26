'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAdminData } from '../AdminDataProvider';
import { useAuth } from '../../context/AuthContext';
import { type Profile } from '../../lib/supabase';
import { AdminDateControls, AdminPanel, EmptyState } from '../admin-ui';
import {
  calculateTeamMemberSummaries,
  filterTicketsByDateRange,
  filterTravelLogsByDateRange,
  formatCompactDateTime,
  formatCurrency,
  formatFuelClaim,
  getDatePresetRange,
  getDateRangeFromSearchParams,
} from '../admin-utils';

function fallbackAvatar(profile: Profile) {
  return profile.avatar || profile.full_name.charAt(0) || 'U';
}

export default function AdminTeamPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-slate-400">
          Loading team page...
        </div>
      }
    >
      <AdminTeamPageContent />
    </Suspense>
  );
}

function AdminTeamPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, loading, isAdmin } = useAuth();
  const {
    profiles,
    tickets,
    travelLogs,
    loading: loadingData,
  } = useAdminData();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!isAdmin) {
      router.replace('/dashboard');
    }
  }, [user, loading, isAdmin, router]);

  const dateRange = useMemo(
    () => getDateRangeFromSearchParams(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );
  const selectedMemberId = searchParams.get('member') ?? 'all';

  const updateParams = (updater: (params: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams.toString());
    updater(next);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const setPreset = (preset: '1d' | '7d' | '30d' | '90d' | '365d') => {
    const range = getDatePresetRange(preset);
    updateParams((params) => {
      params.set('preset', range.preset);
      params.set('startDate', range.startDate);
      params.set('endDate', range.endDate);
    });
  };

  const filteredTickets = useMemo(() => filterTicketsByDateRange(tickets, dateRange), [tickets, dateRange]);
  const filteredTravelLogs = useMemo(() => filterTravelLogsByDateRange(travelLogs, dateRange), [travelLogs, dateRange]);
  const memberSummaries = useMemo(
    () => calculateTeamMemberSummaries(profiles.filter((profile) => profile.is_active), filteredTickets, filteredTravelLogs),
    [profiles, filteredTickets, filteredTravelLogs]
  );
  const visibleSummaries = useMemo(
    () => (selectedMemberId === 'all' ? memberSummaries : memberSummaries.filter((member) => member.profile.id === selectedMemberId)),
    [memberSummaries, selectedMemberId]
  );

  const totalDistance = visibleSummaries.reduce((sum, member) => sum + member.distanceKm, 0);
  const totalClaim = visibleSummaries.reduce((sum, member) => sum + member.fuelClaim, 0);

  if (loading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-400">
        Loading team page...
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <section className="mb-8">
        <h1 className="text-3xl font-semibold text-white">Team</h1>
        <p className="mt-2 text-sm text-slate-400">
          Review member workload, travel activity, response quality, and fuel claims over the selected period.
        </p>
      </section>

      <div className="mb-6">
        <AdminDateControls
          range={dateRange}
          onPresetChange={setPreset}
          onStartDateChange={(value) => {
            updateParams((params) => {
              params.set('preset', 'custom');
              params.set('startDate', value);
              params.set('endDate', dateRange.endDate);
            });
          }}
          onEndDateChange={(value) => {
            updateParams((params) => {
              params.set('preset', 'custom');
              params.set('startDate', dateRange.startDate);
              params.set('endDate', value);
            });
          }}
          compact
        />
      </div>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Active team members</p>
          <p className="mt-4 text-3xl font-semibold text-white">{visibleSummaries.length}</p>
          <p className="mt-2 text-sm text-slate-500">Only active members are included in this overview.</p>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Distance travelled</p>
          <p className="mt-4 text-3xl font-semibold text-cyan-300">{Math.round(totalDistance)} km</p>
          <p className="mt-2 text-sm text-slate-500">{filteredTravelLogs.length} travel logs in this range.</p>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Fuel claims</p>
          <p className="mt-4 text-3xl font-semibold text-blue-300">{formatCurrency(totalClaim)}</p>
          <p className="mt-2 text-sm text-slate-500">Calculated at 5.80 ZAR per kilometre.</p>
        </div>
      </section>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <label className="mb-1 block text-xs text-slate-500">Focus member</label>
          <select
            value={selectedMemberId}
            onChange={(event) => {
              updateParams((params) => {
                params.set('member', event.target.value);
              });
            }}
            className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white"
          >
            <option value="all">All Members</option>
            {profiles.filter((profile) => profile.is_active).map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.full_name}
              </option>
            ))}
          </select>
        </div>

      </div>

      <AdminPanel title="Team performance">
        {loadingData ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/70 px-4 py-10 text-center text-slate-400">
            Loading team data...
          </div>
        ) : visibleSummaries.length === 0 ? (
          <EmptyState title="No team data found" description="Once work is captured in the selected range, member summaries will appear here." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleSummaries.map((member) => (
              <div key={member.profile.id} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
                <div className="flex items-center gap-4">
                  {member.profile.avatar_url ? (
                    <Image
                      src={member.profile.avatar_url}
                      alt={member.profile.full_name}
                      width={64}
                      height={64}
                      className="h-16 w-16 rounded-3xl object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-500 text-xl font-bold text-white">
                      {fallbackAvatar(member.profile)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-white">{member.profile.full_name}</p>
                    <p className="truncate text-sm text-slate-400">{member.profile.role}</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
                    <p className="text-xs text-slate-500">Tickets handled</p>
                    <p className="mt-1 font-semibold text-white">{member.ticketsHandled}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
                    <p className="text-xs text-slate-500">Open</p>
                    <p className="mt-1 font-semibold text-blue-300">{member.openTickets}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
                    <p className="text-xs text-slate-500">Avg response</p>
                    <p className="mt-1 font-semibold text-white">{member.avgResponse ? `${Math.round(member.avgResponse)} min` : '—'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
                    <p className="text-xs text-slate-500">Travel logs</p>
                    <p className="mt-1 font-semibold text-cyan-300">{member.travelLogCount}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Travel + claim</span>
                    <span className="font-medium text-cyan-300">{formatFuelClaim(member.distanceKm)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Last activity</span>
                    <span className="text-right text-xs text-slate-400">{formatCompactDateTime(member.lastActivity)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminPanel>
    </main>
  );
}
