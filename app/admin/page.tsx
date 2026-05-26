'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import WorkspaceLoader from '../components/WorkspaceLoader';
import { useAdminData } from './AdminDataProvider';
import { useAuth } from '../context/AuthContext';
import {
  createTicket,
  type Ticket,
} from '../lib/supabase';
import {
  AdminDateControls,
  AdminPanel,
  EmptyState,
  MetricCard,
  MiniBarChart,
  MiniDonutChart,
  MiniLineChart,
  getMetricCardAccent,
} from './admin-ui';
import {
  applyDateRangeToParams,
  buildAvgResponseSeries,
  buildCreatedResolvedSeries,
  calculateDashboardMetrics,
  calculateTeamMemberSummaries,
  filterTicketsByDateRange,
  filterTicketsByMetricFocus,
  filterTravelLogsByDateRange,
  getClientDistribution,
  getDateRangeFromSearchParams,
  getDatePresetRange,
  getPriorityDistribution,
  getStatusDistribution,
  getTeamDistribution,
  type ChartPoint,
  type MetricFocus,
} from './admin-utils';

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-slate-400">
          Loading admin dashboard...
        </div>
      }
    >
      <AdminPageContent />
    </Suspense>
  );
}

function AdminPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, loading, isAdmin } = useAuth();
  const {
    profiles,
    tickets,
    travelLogs,
    loading: loadingData,
    setTickets,
  } = useAdminData();
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

      setTickets((current) => [data, ...current]);

      resetNewTicketForm();
      closeCreateForm();
    } finally {
      setSubmittingTicket(false);
    }
  };

  const dateRange = useMemo(
    () => getDateRangeFromSearchParams(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );

  const metricFocus = useMemo<MetricFocus>(() => {
    const value = searchParams.get('metric');
    if (value === 'open' || value === 'pending' || value === 'closed' || value === 'avg-response') return value;
    return 'total';
  }, [searchParams]);
  const selectedClient = searchParams.get('client');
  const selectedStatus = searchParams.get('status');
  const selectedPriority = searchParams.get('priority');
  const selectedMember = searchParams.get('member');

  const updateParams = (updater: (params: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams.toString());
    updater(next);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const setPreset = (preset: '1d' | '7d' | '30d' | '90d' | '365d') => {
    const nextRange = getDatePresetRange(preset);
    updateParams((params) => {
      const applied = applyDateRangeToParams(params, nextRange);
      applied.forEach((value, key) => params.set(key, value));
    });
  };

  const setStartDate = (value: string) => {
    updateParams((params) => {
      params.set('preset', 'custom');
      params.set('startDate', value);
      params.set('endDate', dateRange.endDate);
    });
  };

  const setEndDate = (value: string) => {
    updateParams((params) => {
      params.set('preset', 'custom');
      params.set('startDate', dateRange.startDate);
      params.set('endDate', value);
    });
  };

  const setMetricFocus = (nextMetric: MetricFocus) => {
    updateParams((params) => {
      params.set('metric', nextMetric);
    });
  };

  const dateFilteredTickets = useMemo(() => filterTicketsByDateRange(tickets, dateRange), [tickets, dateRange]);
  const dateFilteredTravelLogs = useMemo(() => filterTravelLogsByDateRange(travelLogs, dateRange), [travelLogs, dateRange]);
  const dashboardMetrics = useMemo(() => calculateDashboardMetrics(dateFilteredTickets), [dateFilteredTickets]);
  const focusFilteredTickets = useMemo(
    () => filterTicketsByMetricFocus(dateFilteredTickets, metricFocus),
    [dateFilteredTickets, metricFocus]
  );
  const narrowedTickets = useMemo(
    () =>
      focusFilteredTickets.filter((ticket) => {
        if (selectedClient && ticket.client !== selectedClient) return false;
        if (selectedStatus && ticket.status !== selectedStatus) return false;
        if (selectedPriority && ticket.severity !== selectedPriority) return false;
        if (selectedMember && ticket.user_id !== selectedMember) return false;
        return true;
      }),
    [focusFilteredTickets, selectedClient, selectedMember, selectedPriority, selectedStatus]
  );
  const teamSummaries = useMemo(
    () => calculateTeamMemberSummaries(profiles.filter((profile) => profile.is_active), narrowedTickets, dateFilteredTravelLogs),
    [profiles, narrowedTickets, dateFilteredTravelLogs]
  );
  const createdResolvedSeries = useMemo(() => buildCreatedResolvedSeries(narrowedTickets, dateRange), [narrowedTickets, dateRange]);
  const avgResponseSeries = useMemo(() => buildAvgResponseSeries(narrowedTickets, dateRange), [narrowedTickets, dateRange]);
  const clientDistribution = useMemo(() => getClientDistribution(narrowedTickets), [narrowedTickets]);
  const teamDistribution = useMemo(() => getTeamDistribution(teamSummaries), [teamSummaries]);
  const statusDistribution = useMemo(() => getStatusDistribution(narrowedTickets), [narrowedTickets]);
  const priorityDistribution = useMemo(() => getPriorityDistribution(narrowedTickets), [narrowedTickets]);

  const applyPointRange = (point: ChartPoint) => {
    const pointKey = point.key;
    if (!pointKey) return;
    updateParams((params) => {
      params.set('preset', 'custom');
      params.set('startDate', pointKey);
      params.set('endDate', pointKey);
    });
  };

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
        <section className="mb-8">
          <h1 className="text-3xl font-semibold text-white">Dashboard 🏠</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            A metrics-first overview of ticket creation, resolution trends, workload distribution, and operational health.
          </p>
        </section>

        <div className="mb-8">
          <AdminDateControls
            range={dateRange}
            onPresetChange={setPreset}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
        </div>

        <section className="mb-8 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <MetricCard
            title="Total"
            value={dashboardMetrics.total}
            detail="All tickets created in range"
            emphasis={getMetricCardAccent('total')}
            active={metricFocus === 'total'}
            onClick={() => setMetricFocus('total')}
          />
          <MetricCard
            title="Open"
            value={dashboardMetrics.open}
            detail="Actively being worked"
            emphasis={getMetricCardAccent('open')}
            active={metricFocus === 'open'}
            onClick={() => setMetricFocus('open')}
          />
          <MetricCard
            title="Pending"
            value={dashboardMetrics.pending}
            detail="Awaiting assignment or response"
            emphasis={getMetricCardAccent('pending')}
            active={metricFocus === 'pending'}
            onClick={() => setMetricFocus('pending')}
          />
          <MetricCard
            title="Closed"
            value={dashboardMetrics.closed}
            detail="Resolved inside the selected window"
            emphasis={getMetricCardAccent('closed')}
            active={metricFocus === 'closed'}
            onClick={() => setMetricFocus('closed')}
          />
          <MetricCard
            title="Avg response"
            value={dashboardMetrics.avgResponse ? `${Math.round(dashboardMetrics.avgResponse)} min` : '—'}
            detail="Average response across completed work"
            emphasis={getMetricCardAccent('avg-response')}
            active={metricFocus === 'avg-response'}
            onClick={() => setMetricFocus('avg-response')}
          />
        </section>

        <div className="mb-6 flex flex-wrap gap-2">
          {selectedClient || selectedStatus || selectedPriority || selectedMember ? (
            <button
              type="button"
              onClick={() => {
                updateParams((params) => {
                  params.delete('client');
                  params.delete('status');
                  params.delete('priority');
                  params.delete('member');
                });
              }}
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              Clear graph filters
            </button>
          ) : (
            <span className="rounded-2xl bg-slate-900 px-4 py-2 text-sm text-slate-500">Use the cards and graphs below to drill into the dataset.</span>
          )}
        </div>

        {loadingData ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 px-4 py-10 text-center text-slate-400">
            Loading dashboard metrics...
          </div>
        ) : narrowedTickets.length === 0 ? (
          <EmptyState title="No dashboard metrics available" description="Try another date range or clear the active graph filters." />
        ) : (
          <div className="space-y-6">
            <AdminPanel title="Tickets Created vs Resolved">
              <MiniLineChart data={createdResolvedSeries} mode="dual" onPointClick={applyPointRange} />
            </AdminPanel>

            <AdminPanel title="Average Response Time Trend">
              <MiniLineChart data={avgResponseSeries} mode="single" onPointClick={applyPointRange} />
            </AdminPanel>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <AdminPanel title="Tickets per Client">
                <MiniBarChart
                  data={clientDistribution}
                  onBarClick={(label) => {
                    updateParams((params) => {
                      params.set('client', label);
                    });
                  }}
                />
              </AdminPanel>

              <AdminPanel title="Status Distribution">
                <MiniDonutChart
                  data={statusDistribution}
                  onSliceClick={(label) => {
                    updateParams((params) => {
                      params.set('status', label.toLowerCase());
                    });
                  }}
                />
              </AdminPanel>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <AdminPanel title="Tickets per Team Member">
                <MiniBarChart
                  data={teamDistribution}
                  onBarClick={(label) => {
                    const profile = profiles.find((item) => item.full_name === label);
                    if (!profile) return;
                    updateParams((params) => {
                      params.set('member', profile.id);
                    });
                  }}
                />
              </AdminPanel>

              <AdminPanel title="Priority Mix">
                <MiniDonutChart
                  data={priorityDistribution}
                  onSliceClick={(label) => {
                    updateParams((params) => {
                      params.set('priority', label);
                    });
                  }}
                />
              </AdminPanel>
            </div>
          </div>
        )}
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
                          ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
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
