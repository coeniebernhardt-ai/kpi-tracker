'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import WorkspaceLoader from '../components/WorkspaceLoader';
import { useAuth } from '../context/AuthContext';
import {
  createTicket,
  getAllProfiles,
  getAllTravelLogs,
  getKpiMetrics,
  getLatestTickets,
  type KpiMetrics,
  type Profile,
  type Ticket,
  type TravelLog,
} from '../lib/supabase';

type MemberStat = {
  user_id: string | null;
  open: number;
  closed: number;
  handled: number;
  avgResponseMinutes: number;
};

const dashboardLinks = [
  {
    title: 'Tickets',
    href: '/admin/tickets',
    description: 'Manage ticket workflows, assignments, comments, and ticket detail views.',
    accent: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  },
  {
    title: 'Team',
    href: '/admin/team',
    description: 'Review member profiles and performance from a dedicated team page.',
    accent: 'border-slate-700/50 bg-slate-900/70 text-white',
  },
  {
    title: 'Data Metrics',
    href: '/admin/data-metrics',
    description: 'Open KPI totals and response-time analytics on a full page.',
    accent: 'border-slate-700/50 bg-slate-900/70 text-white',
  },
  {
    title: 'Images',
    href: '/admin/images',
    description: 'Browse profile, ticket, and travel-log images from a single library.',
    accent: 'border-slate-700/50 bg-slate-900/70 text-white',
  },
  {
    title: 'Reports',
    href: '/admin/reports',
    description: 'Run exports from a dedicated reports page instead of a floating panel.',
    accent: 'border-slate-700/50 bg-slate-900/70 text-white',
  },
  {
    title: 'Manage Users',
    href: '/admin/manage-users',
    description: 'See team members, roles, and admin access on their own page.',
    accent: 'border-slate-700/50 bg-slate-900/70 text-white',
  },
];

export default function AdminPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, loading, isAdmin, session } = useAuth();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [travelLogs, setTravelLogs] = useState<TravelLog[]>([]);
  const [kpiMetrics, setKpiMetrics] = useState<KpiMetrics | null>(null);
  const [memberStats, setMemberStats] = useState<MemberStat[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [newTicketData, setNewTicketData] = useState({
    issue: '',
    location: 'remote' as 'on-site' | 'remote',
    client: '',
    clickupTicket: '',
    ticketType: '' as 'Hardware' | 'Software' | '',
    severity: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
    estateOrBuilding: '',
    cmlLocation: '',
  });

  const showCreateForm = searchParams.get('createTicket') === '1';

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

  useEffect(() => {
    if (!user || !isAdmin) return;

    let cancelled = false;

    const loadDashboardData = async () => {
      setLoadingData(true);

      try {
        const [profilesData, recentTickets, travelLogsData, metricsResponse] = await Promise.all([
          getAllProfiles(),
          getLatestTickets({ limit: 8 }),
          getAllTravelLogs(),
          (async () => {
            try {
              const response = await fetch('/api/admin/metrics', {
                headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
              });
              if (!response.ok) return null;
              return response.json();
            } catch {
              return null;
            }
          })(),
        ]);

        if (cancelled) return;

        setProfiles(profilesData);
        setTickets(recentTickets);
        setTravelLogs(travelLogsData);

        if (metricsResponse) {
          setKpiMetrics({
            total_tickets: metricsResponse.totalTickets ?? 0,
            open_tickets: metricsResponse.totalOpen ?? 0,
            closed_tickets: metricsResponse.totalClosed ?? 0,
            pending_tickets: metricsResponse.totalPending ?? 0,
            avg_response_time_minutes: metricsResponse.overallAvgResponseTime ?? null,
            avg_no_deps: metricsResponse.avgResponseTimeNoDependencies ?? null,
            avg_with_deps: metricsResponse.avgResponseTimeWithDependencies ?? null,
          });
          setMemberStats(Array.isArray(metricsResponse.memberStats) ? metricsResponse.memberStats : []);
        } else {
          const fallbackMetrics = await getKpiMetrics();
          if (cancelled) return;
          setKpiMetrics(fallbackMetrics);
          setMemberStats([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingData(false);
        }
      }
    };

    void loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, [user, isAdmin, session?.access_token]);

  const closeCreateForm = () => {
    router.replace(pathname, { scroll: false });
  };

  const resetNewTicketForm = () => {
    setNewTicketData({
      issue: '',
      location: 'remote',
      client: '',
      clickupTicket: '',
      ticketType: '',
      severity: 'MEDIUM',
      estateOrBuilding: '',
      cmlLocation: '',
    });
    setSelectedUserId('');
  };

  const handleCreateTicket = async (event: React.FormEvent) => {
    event.preventDefault();

    if (
      !user?.id ||
      !selectedUserId ||
      !newTicketData.issue.trim() ||
      !newTicketData.client.trim() ||
      !newTicketData.ticketType ||
      !newTicketData.estateOrBuilding.trim() ||
      !newTicketData.cmlLocation.trim()
    ) {
      return;
    }

    setSubmittingTicket(true);

    try {
      const { data, error } = await createTicket({
        user_id: selectedUserId,
        client: newTicketData.client.trim(),
        clickup_ticket: newTicketData.clickupTicket.trim() || undefined,
        location: newTicketData.location,
        issue: newTicketData.issue.trim(),
        created_by: user.id,
        ticket_type: newTicketData.ticketType,
        severity: newTicketData.severity,
        estate_or_building: newTicketData.estateOrBuilding.trim(),
        cml_location: newTicketData.cmlLocation.trim(),
      });

      if (error || !data) {
        alert(error?.message || 'Failed to create ticket.');
        return;
      }

      setTickets((current) => [data, ...current].slice(0, 8));
      if (kpiMetrics) {
        setKpiMetrics({
          ...kpiMetrics,
          total_tickets: (kpiMetrics.total_tickets ?? 0) + 1,
          pending_tickets: (kpiMetrics.pending_tickets ?? 0) + 1,
        });
      }

      resetNewTicketForm();
      closeCreateForm();
    } finally {
      setSubmittingTicket(false);
    }
  };

  const recentTravelLogs = useMemo(
    () =>
      [...travelLogs]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5),
    [travelLogs]
  );

  const memberNames = useMemo(
    () =>
      profiles.reduce<Record<string, string>>((acc, profile) => {
        acc[profile.id] = profile.full_name;
        return acc;
      }, {}),
    [profiles]
  );

  const topMembers = useMemo(
    () =>
      [...memberStats]
        .filter((member) => member.user_id)
        .sort((a, b) => b.handled - a.handled)
        .slice(0, 4),
    [memberStats]
  );

  if (loading || (!user && !isAdmin)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-400">
        Loading admin dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 bg-grid-pattern bg-radial-gradient">
      <WorkspaceLoader active={loadingData} />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              The admin landing page is back to a dashboard view, while tickets, team, metrics, images, reports,
              and user management live on dedicated routes.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/notifications"
              className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm text-slate-300 transition-colors hover:border-blue-500/30 hover:text-white"
            >
              Notifications
            </Link>
            <Link
              href="/admin?createTicket=1"
              className="inline-flex items-center rounded-xl border border-blue-500/30 bg-blue-500/15 px-4 py-2 text-sm font-medium text-blue-300 transition-colors hover:bg-blue-500/20"
            >
              Create Ticket
            </Link>
          </div>
        </section>

        <section className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/70 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Total Tickets</p>
            <p className="mt-3 text-3xl font-bold text-white">{kpiMetrics?.total_tickets ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-blue-300">Open</p>
            <p className="mt-3 text-3xl font-bold text-blue-300">{kpiMetrics?.open_tickets ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-amber-300">Pending</p>
            <p className="mt-3 text-3xl font-bold text-amber-300">{kpiMetrics?.pending_tickets ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/70 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Avg Response</p>
            <p className="mt-3 text-3xl font-bold text-white">
              {kpiMetrics?.avg_response_time_minutes ? `${kpiMetrics.avg_response_time_minutes}m` : '—'}
            </p>
          </div>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {dashboardLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-2xl border p-5 transition-colors hover:border-blue-500/30 ${link.accent}`}
            >
              <p className="text-sm font-semibold">{link.title}</p>
              <p className="mt-2 text-sm text-slate-400">{link.description}</p>
            </Link>
          ))}
        </section>

        <section className="mb-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/70 p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">Recent Tickets</h2>
              <Link href="/admin/tickets" className="text-sm text-blue-400 hover:text-blue-300">
                View all
              </Link>
            </div>

            {tickets.length === 0 ? (
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 px-4 py-10 text-center text-slate-400">
                No recent tickets found.
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-slate-700 px-2 py-0.5 text-xs font-bold text-slate-200">
                        {ticket.ticket_number}
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${
                          ticket.status === 'pending'
                            ? 'bg-amber-500/20 text-amber-300'
                            : ticket.status === 'open'
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {ticket.status}
                      </span>
                      {ticket.client && (
                        <span className="rounded bg-slate-700/70 px-2 py-0.5 text-xs text-slate-300">
                          {ticket.client}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-slate-200">{ticket.issue}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {new Date(ticket.created_at).toLocaleDateString('en-ZA', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/70 p-6">
              <h2 className="mb-4 text-lg font-semibold text-white">Admin Summary</h2>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Members</p>
                  <p className="mt-2 text-2xl font-bold text-white">{profiles.length}</p>
                </div>
                <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Active Members</p>
                  <p className="mt-2 text-2xl font-bold text-white">{profiles.filter((profile) => profile.is_active).length}</p>
                </div>
                <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Travel Logs</p>
                  <p className="mt-2 text-2xl font-bold text-white">{travelLogs.length}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/70 p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-white">Top Members</h2>
                <Link href="/admin/team" className="text-sm text-blue-400 hover:text-blue-300">
                  Team page
                </Link>
              </div>

              {topMembers.length === 0 ? (
                <p className="text-sm text-slate-400">Member performance data will appear here once metrics load.</p>
              ) : (
                <div className="space-y-3">
                  {topMembers.map((member) => (
                    <div key={member.user_id} className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-white">
                            {member.user_id ? memberNames[member.user_id] ?? 'Unknown member' : 'Unassigned'}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {member.open} open, {member.closed} closed
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-blue-300">{member.handled} handled</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {member.avgResponseMinutes > 0 ? `${member.avgResponseMinutes}m avg` : 'No avg yet'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-700/50 bg-slate-900/70 p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">Recent Travel Logs</h2>
            <Link href="/admin/reports" className="text-sm text-blue-400 hover:text-blue-300">
              Export travel data
            </Link>
          </div>

          {recentTravelLogs.length === 0 ? (
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 px-4 py-10 text-center text-slate-400">
              No travel logs found.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {recentTravelLogs.map((log) => (
                <div key={log.id} className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4">
                  <p className="text-sm font-medium text-white">{log.reason}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {memberNames[log.user_id] ?? 'Unknown member'} •{' '}
                    {new Date(log.created_at).toLocaleDateString('en-ZA', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {log.distance_travelled ? (
                    <p className="mt-3 text-sm text-blue-300">
                      {log.distance_travelled} km{log.is_return_trip ? ' return trip' : ''}
                    </p>
                  ) : null}
                  {log.comments ? <p className="mt-3 line-clamp-2 text-sm text-slate-400">{log.comments}</p> : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {showCreateForm && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeCreateForm} />
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700/50 bg-slate-900 shadow-2xl">
              <div className="sticky top-0 border-b border-slate-700/50 bg-slate-900 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Create Ticket</h2>
                  <button
                    onClick={closeCreateForm}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <form onSubmit={handleCreateTicket} className="space-y-5 p-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Assign to <span className="text-blue-400">*</span>
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(event) => setSelectedUserId(event.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"
                  >
                    <option value="">Select a team member...</option>
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.full_name} ({profile.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Client <span className="text-blue-400">*</span>
                  </label>
                  <select
                    value={newTicketData.client}
                    onChange={(event) => setNewTicketData({ ...newTicketData, client: event.target.value })}
                    required
                    className="w-full cursor-pointer appearance-none rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"
                  >
                    <option value="">Select a client...</option>
                    <option value="Redefine">Redefine</option>
                    <option value="Balwin">Balwin</option>
                    <option value="Go Waterfall">Go Waterfall</option>
                    <option value="Go City">Go City</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Type <span className="text-blue-400">*</span>
                  </label>
                  <select
                    value={newTicketData.ticketType}
                    onChange={(event) =>
                      setNewTicketData({
                        ...newTicketData,
                        ticketType: event.target.value as 'Hardware' | 'Software' | '',
                      })
                    }
                    required
                    className="w-full cursor-pointer appearance-none rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"
                  >
                    <option value="">Select type...</option>
                    <option value="Hardware">Hardware</option>
                    <option value="Software">Software</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Severity <span className="text-blue-400">*</span>
                  </label>
                  <select
                    value={newTicketData.severity}
                    onChange={(event) =>
                      setNewTicketData({
                        ...newTicketData,
                        severity: event.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
                      })
                    }
                    required
                    className="w-full cursor-pointer appearance-none rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Estate or Building <span className="text-blue-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newTicketData.estateOrBuilding}
                    onChange={(event) => setNewTicketData({ ...newTicketData, estateOrBuilding: event.target.value })}
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"
                    placeholder="Enter estate or building name..."
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Location <span className="text-blue-400">*</span>
                  </label>
                  <p className="mb-2 text-xs text-slate-500">as per CML</p>
                  <input
                    type="text"
                    value={newTicketData.cmlLocation}
                    onChange={(event) => setNewTicketData({ ...newTicketData, cmlLocation: event.target.value })}
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"
                    placeholder="Enter location..."
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    ClickUp Ticket <span className="text-slate-500">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={newTicketData.clickupTicket}
                    onChange={(event) => setNewTicketData({ ...newTicketData, clickupTicket: event.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"
                    placeholder="Enter ClickUp ticket ID..."
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Ticket Location</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setNewTicketData({ ...newTicketData, location: 'on-site' })}
                      className={`flex-1 rounded-xl border px-4 py-3 ${
                        newTicketData.location === 'on-site'
                          ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                          : 'border-slate-700 bg-slate-800 text-slate-400'
                      }`}
                    >
                      On-Site
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTicketData({ ...newTicketData, location: 'remote' })}
                      className={`flex-1 rounded-xl border px-4 py-3 ${
                        newTicketData.location === 'remote'
                          ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                          : 'border-slate-700 bg-slate-800 text-slate-400'
                      }`}
                    >
                      Remote
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Issue Description <span className="text-blue-400">*</span>
                  </label>
                  <textarea
                    value={newTicketData.issue}
                    onChange={(event) => setNewTicketData({ ...newTicketData, issue: event.target.value })}
                    rows={4}
                    required
                    className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"
                    placeholder="Describe the issue..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={
                      submittingTicket ||
                      !selectedUserId ||
                      !newTicketData.issue.trim() ||
                      !newTicketData.client.trim() ||
                      !newTicketData.ticketType ||
                      !newTicketData.estateOrBuilding.trim() ||
                      !newTicketData.cmlLocation.trim()
                    }
                    className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 font-medium text-white disabled:opacity-50"
                  >
                    {submittingTicket ? 'Creating...' : 'Create Ticket'}
                  </button>
                  <button
                    type="button"
                    onClick={closeCreateForm}
                    className="rounded-xl bg-slate-700 px-5 py-3 text-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
