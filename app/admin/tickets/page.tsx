'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAdminData } from '../AdminDataProvider';
import { useAuth } from '../../context/AuthContext';
import {
  createNotificationsForNewAssignments,
  deleteTicket,
  getTicketById,
  supabase,
  type Ticket,
  updateTicket,
} from '../../lib/supabase';
import { AdminDateControls, AdminPanel, EmptyState, SegmentedControl } from '../admin-ui';
import {
  extractRelatedTicketFromTravelLog,
  filterTicketsByDateRange,
  filterTravelLogsByDateRange,
  formatCompactDateTime,
  formatFuelClaim,
  getDatePresetRange,
  getDateRangeFromSearchParams,
  type TicketsTab,
} from '../admin-utils';

function getAvatarGradient(name: string) {
  const colors = ['from-blue-400 to-blue-600', 'from-blue-500 to-cyan-500', 'from-cyan-400 to-blue-500', 'from-blue-600 to-cyan-500', 'from-cyan-400 to-blue-500'];
  return colors[name.charCodeAt(0) % colors.length];
}

export default function AdminTicketsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-slate-400">
          Loading tickets...
        </div>
      }
    >
      <AdminTicketsPageContent />
    </Suspense>
  );
}

function AdminTicketsPageContent() {
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
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [expandedTickets, setExpandedTickets] = useState<Set<string>>(new Set());
  const [expandedTicketDetails, setExpandedTicketDetails] = useState<Record<string, Ticket | null>>({});
  const [assigningTicketId, setAssigningTicketId] = useState<string | null>(null);
  const [adminCommentTicketId, setAdminCommentTicketId] = useState<string | null>(null);
  const [adminCommentText, setAdminCommentText] = useState('');
  const [adminCommentSubmitting, setAdminCommentSubmitting] = useState(false);

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
  const activeTab = (searchParams.get('tab') as TicketsTab | null) === 'travel-logs' ? 'travel-logs' : 'tickets';
  const filterUser = searchParams.get('member') ?? 'all';
  const filterStatus = (searchParams.get('status') as 'all' | 'pending' | 'open' | 'closed' | null) ?? 'all';
  const filterIssueSearch = searchParams.get('q') ?? '';
  const ticketFocusId = searchParams.get('ticket');

  const updateParams = (updater: (params: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams.toString());
    updater(next);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const fetchTicketDetail = async (ticketId: string) => {
    if (expandedTicketDetails[ticketId] !== undefined) return;

    setLoadingDetailId(ticketId);
    try {
      const detail = await getTicketById(ticketId);
      setExpandedTicketDetails((current) => ({ ...current, [ticketId]: detail ?? null }));
    } finally {
      setLoadingDetailId(null);
    }
  };

  useEffect(() => {
    if (!ticketFocusId) return;
    setExpandedTickets((current) => {
      const next = new Set(current);
      next.add(ticketFocusId);
      return next;
    });
    void fetchTicketDetail(ticketFocusId);
  }, [ticketFocusId]);

  const setPreset = (preset: '1d' | '7d' | '30d' | '90d' | '365d') => {
    const range = getDatePresetRange(preset);
    updateParams((params) => {
      params.set('preset', range.preset);
      params.set('startDate', range.startDate);
      params.set('endDate', range.endDate);
    });
  };

  const dateFilteredTickets = useMemo(() => filterTicketsByDateRange(tickets, dateRange), [tickets, dateRange]);
  const dateFilteredTravelLogs = useMemo(() => filterTravelLogsByDateRange(travelLogs, dateRange), [travelLogs, dateRange]);

  const filteredTickets = useMemo(
    () =>
      dateFilteredTickets.filter((ticket) => {
        if (filterUser !== 'all' && ticket.user_id !== filterUser) return false;
        if (filterStatus !== 'all' && ticket.status !== filterStatus) return false;
        const query = filterIssueSearch.trim().toLowerCase();
        if (query && !`${ticket.issue} ${ticket.client} ${ticket.ticket_number}`.toLowerCase().includes(query)) return false;
        return true;
      }),
    [dateFilteredTickets, filterIssueSearch, filterStatus, filterUser]
  );

  const memberNames = useMemo(
    () =>
      profiles.reduce<Record<string, string>>((acc, profile) => {
        acc[profile.id] = profile.full_name;
        return acc;
      }, {}),
    [profiles]
  );

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) return;

    try {
      const result = await deleteTicket(ticketId);
      if (result.error) {
        alert(`Failed to delete ticket: ${result.error}`);
        return;
      }

      setTickets((current) => current.filter((ticket) => ticket.id !== ticketId));
      setExpandedTickets((current) => {
        const next = new Set(current);
        next.delete(ticketId);
        return next;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to delete ticket: ${message}`);
    }
  };

  const handleAddAdminComment = async (ticketId: string) => {
    const text = adminCommentText.trim();
    if (!text || !user?.id) return;

    setAdminCommentSubmitting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const response = await fetch('/api/admin/ticket-comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ticketId, text, userId: user.id }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        alert(data?.error || 'Error adding comment');
        return;
      }

      const refreshed = await getTicketById(ticketId);
      if (refreshed) {
        setTickets((current) => current.map((ticket) => ticket.id === ticketId ? refreshed : ticket));
        setExpandedTicketDetails((current) => ({ ...current, [ticketId]: refreshed }));
      }
      setAdminCommentTicketId(null);
      setAdminCommentText('');
    } finally {
      setAdminCommentSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-400">
        Loading tickets...
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <section className="mb-8">
        <h1 className="text-3xl font-semibold text-white">Tickets</h1>
        <p className="mt-2 text-sm text-slate-400">
          Keep ticket workflows and travel operations in one route, with URL-driven status and date filters.
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

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <SegmentedControl
          value={activeTab}
          onChange={(value) => {
            updateParams((params) => {
              params.set('tab', value);
            });
          }}
          options={[
            { value: 'tickets', label: 'Tickets' },
            { value: 'travel-logs', label: 'Travel Logs' },
          ]}
        />

        {activeTab === 'tickets' && (
          <div className="flex flex-wrap gap-2">
            {(['all', 'open', 'pending', 'closed'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => {
                  updateParams((params) => {
                    params.set('status', status);
                  });
                }}
                className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                  filterStatus === status
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeTab === 'tickets' ? (
        <>
          <section className="mb-6 flex flex-wrap items-center gap-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Filter by member</label>
              <select
                value={filterUser}
                onChange={(event) => {
                  updateParams((params) => {
                    params.set('member', event.target.value);
                  });
                }}
                className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white"
              >
                <option value="all">All Members</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-[240px] flex-1">
              <label className="mb-1 block text-xs text-slate-500">Search issue, client, or ticket number</label>
              <input
                type="text"
                value={filterIssueSearch}
                onChange={(event) => {
                  updateParams((params) => {
                    params.set('q', event.target.value);
                  });
                }}
                placeholder="Search in tickets..."
                className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
              />
            </div>

            <div className="ml-auto rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-400">
              {filteredTickets.length} result{filteredTickets.length !== 1 ? 's' : ''}
            </div>
          </section>

          <AdminPanel title="Ticket queue">
            {loadingData ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-950/70 px-4 py-10 text-center text-slate-400">
                Loading tickets...
              </div>
            ) : filteredTickets.length === 0 ? (
              <EmptyState title="No tickets found" description="Try another date window, member, or status filter." />
            ) : (
              <div className="space-y-3">
                {filteredTickets.map((ticket) => {
                  const isExpanded = expandedTickets.has(ticket.id);
                  return (
                    <div
                      key={ticket.id}
                      id={`ticket-${ticket.id}`}
                      className={`rounded-3xl border p-4 ${
                        ticket.status === 'pending'
                          ? 'border-amber-500/30 bg-amber-900/15'
                          : ticket.status === 'open'
                            ? 'border-blue-500/20 bg-slate-950/75'
                            : 'border-slate-800 bg-slate-950/65'
                      }`}
                    >
                      <div
                        className="flex cursor-pointer items-center justify-between gap-3"
                        onClick={() => {
                          const next = new Set(expandedTickets);
                          if (isExpanded) {
                            next.delete(ticket.id);
                          } else {
                            next.add(ticket.id);
                            void fetchTicketDetail(ticket.id);
                          }
                          setExpandedTickets(next);
                        }}
                      >
                        <div className="flex flex-1 flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            ticket.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-300'
                              : ticket.status === 'open'
                                ? 'bg-blue-500/20 text-blue-300'
                                : 'bg-slate-800 text-slate-300'
                          }`}>
                            {ticket.ticket_number}
                          </span>
                          {ticket.client && <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">{ticket.client}</span>}
                          {ticket.estate_or_building && <span className="rounded-full bg-slate-800/80 px-2.5 py-1 text-xs text-slate-400">{ticket.estate_or_building}</span>}
                          {ticket.severity && (
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                                ticket.severity === 'LOW'
                                  ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400'
                                  : ticket.severity === 'MEDIUM'
                                    ? 'border-yellow-500/30 bg-yellow-500/20 text-yellow-400'
                                    : ticket.severity === 'HIGH'
                                      ? 'border-orange-500/30 bg-orange-500/20 text-orange-400'
                                      : 'border-red-500/30 bg-red-500/20 text-red-400'
                              }`}
                            >
                              {ticket.severity}
                            </span>
                          )}
                        </div>

                        <button className="rounded-lg p-1 hover:bg-slate-800/80">
                          <svg className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>

                      {!isExpanded && <p className="mt-3 line-clamp-1 text-sm text-slate-400">{ticket.issue}</p>}

                      {isExpanded && (
                        <div className="mt-4 border-t border-slate-800 pt-4">
                          {loadingDetailId === ticket.id ? (
                            <div className="text-sm text-slate-400">Loading ticket details...</div>
                          ) : (() => {
                            const detail = expandedTicketDetails[ticket.id] ?? ticket;
                            const memberProfile = detail.user_id ? profiles.find((profile) => profile.id === detail.user_id) : null;
                            const assignedProfiles = detail.assigned_profiles ?? [];
                            const assignedIds = detail.assigned_to ?? [];

                            return (
                              <div className="flex items-start gap-4">
                                {memberProfile?.avatar_url ? (
                                  <Image src={memberProfile.avatar_url} alt={memberProfile.full_name} width={40} height={40} className="h-10 w-10 rounded-2xl object-cover" />
                                ) : (
                                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${getAvatarGradient(memberProfile?.full_name || 'U')} text-sm font-bold text-white`}>
                                    {memberProfile?.avatar || 'U'}
                                  </div>
                                )}

                                <div className="min-w-0 flex-1">
                                  <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <span className="text-xs text-slate-500">{memberProfile?.full_name ?? 'Unassigned'}</span>
                                    <span className={`rounded-full px-2 py-0.5 text-xs ${detail.location === 'on-site' ? 'bg-blue-500/20 text-blue-400' : 'bg-cyan-500/20 text-cyan-300'}`}>
                                      {detail.location === 'on-site' ? 'On-Site' : 'Remote'}
                                    </span>
                                    <span className={`rounded-full px-2 py-0.5 text-xs ${detail.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : detail.status === 'open' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-300'}`}>
                                      {detail.status === 'pending' ? 'Pending' : detail.status === 'open' ? 'Open' : 'Closed'}
                                    </span>
                                  </div>

                                  <p className="mb-3 text-sm text-slate-300">{detail.issue}</p>

                                  <div className="mb-3 flex flex-wrap gap-2 text-xs">
                                    {detail.ticket_type && <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300">{detail.ticket_type}</span>}
                                    {detail.estate_or_building && <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300">{detail.estate_or_building}</span>}
                                    {detail.cml_location && <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300">{detail.cml_location}</span>}
                                    {detail.has_dependencies && detail.dependency_name && <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-blue-400">{detail.dependency_name}</span>}
                                    <span className="rounded-full bg-slate-800/70 px-2 py-0.5 text-slate-400">
                                      Assigned: {assignedProfiles.length > 0 ? assignedProfiles.map((profile) => profile.full_name).join(', ') : 'No members assigned'}
                                    </span>
                                  </div>

                                  <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                                    <div className="mb-3 flex items-center justify-between">
                                      <p className="text-sm font-medium text-slate-200">Assign Members</p>
                                      <button type="button" onClick={() => setAssigningTicketId(assigningTicketId === ticket.id ? null : ticket.id)} className="rounded-2xl bg-blue-500/20 px-3 py-1 text-xs text-blue-400 hover:bg-blue-500/30">
                                        {assigningTicketId === ticket.id ? 'Done' : 'Manage Assignees'}
                                      </button>
                                    </div>

                                    {assigningTicketId === ticket.id && (
                                      <div className="space-y-2">
                                        {profiles.filter((profile) => profile.id !== ticket.user_id).map((profile) => {
                                          const isAssigned = assignedIds.includes(profile.id);

                                          return (
                                            <label key={profile.id} className="flex cursor-pointer items-center gap-3 rounded-2xl p-2 hover:bg-slate-900/80">
                                              <input
                                                type="checkbox"
                                                checked={isAssigned}
                                                onChange={async (event) => {
                                                  const currentAssigned = detail.assigned_to ?? [];
                                                  const newAssigned = event.target.checked
                                                    ? (currentAssigned.includes(profile.id) ? currentAssigned : [...currentAssigned, profile.id])
                                                    : currentAssigned.filter((id) => id !== profile.id);
                                                  const updatePayload: Partial<Ticket> = { assigned_to: newAssigned };

                                                  if (detail.status === 'pending' && newAssigned.length > 0) {
                                                    updatePayload.user_id = newAssigned[0];
                                                    updatePayload.status = 'open';
                                                  }

                                                  const { error } = await updateTicket(ticket.id, updatePayload);
                                                  if (!error) {
                                                    await createNotificationsForNewAssignments(ticket.id, currentAssigned, newAssigned, user?.id ?? '', 'admin');
                                                    const refreshed = await getTicketById(ticket.id);
                                                    if (refreshed) {
                                                      setTickets((current) => current.map((currentTicket) => currentTicket.id === ticket.id ? refreshed : currentTicket));
                                                      setExpandedTicketDetails((current) => ({ ...current, [ticket.id]: refreshed }));
                                                    }
                                                    setAssigningTicketId(null);
                                                  }
                                                }}
                                                className="h-4 w-4 rounded border-slate-700"
                                                style={{ accentColor: '#1e3a5f' }}
                                              />

                                              {profile.avatar_url ? (
                                                <Image src={profile.avatar_url} alt={profile.full_name} width={24} height={24} className="h-6 w-6 rounded-lg object-cover" />
                                              ) : (
                                                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-xs font-bold text-white">
                                                  {profile.avatar}
                                                </div>
                                              )}

                                              <span className="text-sm text-slate-300">{profile.full_name}</span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>

                                  {detail.updates && detail.updates.length > 0 && (
                                    <div className="mb-4 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3">
                                      <p className="mb-2 text-xs text-blue-400">Updates ({detail.updates.length})</p>
                                      <div className="space-y-2">
                                        {detail.updates.map((update, index) => (
                                          <div key={`${detail.id}-update-${index}`} className={`text-xs ${update.authorRole === 'admin' ? 'border-l-2 border-amber-500/50 pl-2' : ''}`}>
                                            {update.authorRole === 'admin' && <span className="mr-1 font-medium text-amber-400">Admin comment:</span>}
                                            <span className="text-blue-300">[{new Date(update.timestamp).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}]</span>
                                            <span className="ml-1 text-slate-300">{update.text}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3">
                                    <p className="mb-1 text-xs text-amber-400">Add admin comment</p>
                                    {adminCommentTicketId === ticket.id ? (
                                      <>
                                        <textarea
                                          value={adminCommentText}
                                          onChange={(event) => setAdminCommentText(event.target.value)}
                                          placeholder="Comment visible to member"
                                          rows={2}
                                          className="w-full rounded-2xl bg-slate-950 px-2 py-1.5 text-xs text-white placeholder-slate-500"
                                        />
                                        <div className="mt-2 flex gap-2">
                                          <button type="button" onClick={() => void handleAddAdminComment(ticket.id)} disabled={!adminCommentText.trim() || adminCommentSubmitting} className="rounded-2xl bg-amber-500/30 px-2 py-1 text-xs font-medium text-amber-300 disabled:opacity-50">
                                            {adminCommentSubmitting ? 'Adding...' : 'Add comment'}
                                          </button>
                                          <button type="button" onClick={() => { setAdminCommentTicketId(null); setAdminCommentText(''); }} className="rounded-2xl bg-slate-800 px-2 py-1 text-xs text-slate-300">
                                            Cancel
                                          </button>
                                        </div>
                                      </>
                                    ) : (
                                      <button type="button" onClick={() => { setAdminCommentTicketId(ticket.id); setAdminCommentText(''); }} className="rounded-2xl bg-amber-500/20 px-2 py-1 text-xs text-amber-300 hover:bg-amber-500/30">
                                        + Add admin comment
                                      </button>
                                    )}
                                  </div>

                                  <p className="mt-3 text-xs text-slate-600">
                                    Created: {formatCompactDateTime(detail.created_at)}
                                    {detail.closed_at && <> • Closed: {formatCompactDateTime(detail.closed_at)}</>}
                                    {detail.response_time_minutes && detail.response_time_minutes > 0 && <> • Response: {detail.response_time_minutes} min</>}
                                  </p>
                                </div>

                                <button type="button" onClick={() => void handleDeleteTicket(ticket.id)} className="shrink-0 rounded-2xl bg-blue-500/10 p-2 text-blue-400 hover:bg-blue-500/20" title="Delete ticket">
                                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </AdminPanel>
        </>
      ) : (
        <AdminPanel
          title="Travel log activity"
          action={<span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">{dateFilteredTravelLogs.length} rows</span>}
        >
          {loadingData ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-950/70 px-4 py-10 text-center text-slate-400">
              Loading travel logs...
            </div>
          ) : dateFilteredTravelLogs.length === 0 ? (
            <EmptyState title="No travel logs found" description="Travel history in the selected date range will appear here." />
          ) : (
            <div className="space-y-3">
              {dateFilteredTravelLogs.map((log) => {
                const relatedTicket = extractRelatedTicketFromTravelLog(log, tickets);
                const claim = log.distance_travelled ? formatFuelClaim(log.distance_travelled) : 'Claim pending';
                return (
                  <div key={log.id} className="grid gap-4 rounded-3xl border border-slate-800 bg-slate-950/70 p-4 md:grid-cols-[1.1fr_0.75fr_0.8fr_1fr]">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Date</p>
                      <p className="mt-2 text-sm font-medium text-white">{formatCompactDateTime(log.created_at)}</p>
                      <p className="mt-2 text-sm text-slate-400">{log.reason}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">User</p>
                      <p className="mt-2 text-sm font-medium text-white">{memberNames[log.user_id] ?? 'Unknown member'}</p>
                      <p className="mt-1 text-xs text-slate-500">{log.start_address ?? 'No start address'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Distance / Claim</p>
                      <p className="mt-2 text-sm font-medium text-cyan-300">{claim}</p>
                      <p className="mt-1 text-xs text-slate-500">{log.end_address ?? 'No destination'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Related ticket</p>
                      {relatedTicket ? (
                        <Link
                          href={`/admin/tickets?tab=tickets&ticket=${relatedTicket.id}&preset=${dateRange.preset}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`}
                          className="mt-2 inline-flex rounded-2xl bg-blue-500/10 px-3 py-2 text-sm font-medium text-blue-300 transition hover:bg-blue-500/20"
                        >
                          {relatedTicket.ticket_number}
                        </Link>
                      ) : (
                        <p className="mt-2 text-sm text-slate-400">No linked ticket found</p>
                      )}
                      {log.comments ? <p className="mt-2 text-xs text-slate-500">{log.comments}</p> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </AdminPanel>
      )}
    </main>
  );
}
