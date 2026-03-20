'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import {
  createNotificationsForNewAssignments,
  deleteTicket,
  getAllProfiles,
  getLatestTickets,
  getNextTickets,
  getTicketById,
  supabase,
  type Profile,
  type Ticket,
  updateTicket,
} from '../../lib/supabase';

function getAvatarGradient(name: string) {
  const colors = ['from-blue-400 to-blue-600', 'from-blue-500 to-indigo-600', 'from-indigo-400 to-blue-500', 'from-blue-600 to-cyan-500', 'from-cyan-400 to-blue-500'];
  return colors[name.charCodeAt(0) % colors.length];
}

export default function AdminTicketsPage() {
  const router = useRouter();
  const { user, loading, isAdmin } = useAuth();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingMoreTickets, setLoadingMoreTickets] = useState(false);
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [expandedTickets, setExpandedTickets] = useState<Set<string>>(new Set());
  const [expandedTicketDetails, setExpandedTicketDetails] = useState<Record<string, Ticket | null>>({});
  const [assigningTicketId, setAssigningTicketId] = useState<string | null>(null);
  const [adminCommentTicketId, setAdminCommentTicketId] = useState<string | null>(null);
  const [adminCommentText, setAdminCommentText] = useState('');
  const [adminCommentSubmitting, setAdminCommentSubmitting] = useState(false);
  const [filterUser, setFilterUser] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'open' | 'closed'>('all');
  const [filterIssueSearch, setFilterIssueSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    setDateTo(today.toISOString().split('T')[0]);
    setDateFrom(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (!user || !isAdmin) return;

    let cancelled = false;

    const loadInitialData = async () => {
      const [profilesData, ticketsData] = await Promise.all([
        getAllProfiles(),
        getLatestTickets({ limit: 30 }),
      ]);

      if (cancelled) return;

      setProfiles(profilesData);
      setTickets(ticketsData);
      setLoadingTickets(false);
    };

    void loadInitialData();

    return () => {
      cancelled = true;
    };
  }, [user, isAdmin]);

  const loadTickets = async (from?: string, to?: string) => {
    setLoadingTickets(true);
    setExpandedTickets(new Set());

    try {
      const data = await getLatestTickets({
        limit: 30,
        dateFrom: (from ?? dateFrom) || undefined,
        dateTo: (to ?? dateTo) || undefined,
      });
      setTickets(data);
    } finally {
      setLoadingTickets(false);
    }
  };

  const loadMoreTickets = async () => {
    if (tickets.length === 0) return;

    setLoadingMoreTickets(true);

    try {
      const lastTicket = tickets[tickets.length - 1];
      const nextTickets = await getNextTickets(lastTicket.created_at, {
        limit: 30,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setTickets((current) => [...current, ...nextTickets]);
    } finally {
      setLoadingMoreTickets(false);
    }
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

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) return;

    try {
      const result = await deleteTicket(ticketId);
      if (result.error) {
        alert(`Failed to delete ticket: ${result.error}`);
        return;
      }

      setTickets((current) => current.filter((ticket) => ticket.id !== ticketId));
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

      await loadTickets();
      setAdminCommentTicketId(null);
      setAdminCommentText('');
    } finally {
      setAdminCommentSubmitting(false);
    }
  };

  const filteredTickets = useMemo(() => tickets.filter((ticket) => {
    if (filterUser !== 'all' && ticket.user_id !== filterUser) return false;
    if (filterStatus !== 'all' && ticket.status !== filterStatus) return false;

    const query = filterIssueSearch.trim().toLowerCase();
    if (query && !(ticket.issue || '').toLowerCase().includes(query)) return false;

    return true;
  }), [tickets, filterUser, filterStatus, filterIssueSearch]);

  if (loading || !user) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-slate-400">
        Loading tickets...
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <section className="mb-6">
        <h1 className="text-3xl font-bold text-white">Tickets</h1>
        <p className="mt-2 text-sm text-slate-400">
          Ticket management is now a dedicated full page instead of a dashboard tab.
        </p>
      </section>

      <section className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-700/50 bg-slate-900/70 p-4">
        <div>
          <label className="mb-1 block text-xs text-slate-500">Filter by Member</label>
          <select value={filterUser} onChange={(event) => setFilterUser(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-white">
            <option value="all">All Members</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>{profile.full_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-500">Filter by Status</label>
          <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value as 'all' | 'pending' | 'open' | 'closed')} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-white">
            <option value="all">All Status</option>
            <option value="pending">Pending Only</option>
            <option value="open">Open Only</option>
            <option value="closed">Closed Only</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-500">Start Date</label>
          <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-white outline-none focus:border-blue-500" />
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-500">End Date</label>
          <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-white outline-none focus:border-blue-500" />
        </div>

        <button type="button" onClick={() => void loadTickets()} className="self-end rounded-xl border border-blue-500/30 bg-blue-500/20 px-4 py-2 text-sm text-blue-400 hover:bg-blue-500/30">
          Apply date range
        </button>

        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-xs text-slate-500">Search issue description</label>
          <input
            type="text"
            value={filterIssueSearch}
            onChange={(event) => setFilterIssueSearch(event.target.value)}
            placeholder="Search in issue..."
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
          />
        </div>

        <div className="ml-auto text-sm text-slate-400">
          Showing {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''}
        </div>
      </section>

      <section>
        {loadingTickets ? (
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/70 px-4 py-10 text-center text-slate-400">
            Loading tickets...
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/70 px-4 py-10 text-center text-slate-400">
            No tickets found.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((ticket) => {
              const isExpanded = expandedTickets.has(ticket.id);

              return (
                <div key={ticket.id} className={`rounded-xl border p-4 ${ticket.status === 'pending' ? 'border-amber-500/30 bg-amber-900/20' : ticket.status === 'open' ? 'border-blue-500/30 bg-slate-800/40' : 'border-slate-700/50 bg-slate-800/30'}`}>
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
                      <span className={`rounded px-2 py-0.5 text-xs font-bold font-mono ${ticket.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : ticket.status === 'open' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-300'}`}>
                        {ticket.ticket_number}
                      </span>
                      {ticket.client && <span className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-300">{ticket.client}</span>}
                      {ticket.estate_or_building && <span className="rounded bg-slate-700/70 px-2 py-0.5 text-xs text-slate-300">{ticket.estate_or_building}</span>}
                      {ticket.severity && (
                        <span className={`rounded border px-2 py-0.5 text-xs font-medium ${
                          ticket.severity === 'LOW' ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400' :
                          ticket.severity === 'MEDIUM' ? 'border-yellow-500/30 bg-yellow-500/20 text-yellow-400' :
                          ticket.severity === 'HIGH' ? 'border-orange-500/30 bg-orange-500/20 text-orange-400' :
                          'border-red-500/30 bg-red-500/20 text-red-400'
                        }`}>
                          {ticket.severity}
                        </span>
                      )}
                    </div>

                    <button className="rounded-lg p-1 hover:bg-slate-700/50">
                      <svg className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {!isExpanded && (
                    <p className="mt-2 line-clamp-1 text-sm text-slate-400">{ticket.issue}</p>
                  )}

                  {isExpanded && (
                    <div className="mt-4 border-t border-slate-700/50 pt-4">
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
                              <Image src={memberProfile.avatar_url} alt={memberProfile.full_name} width={40} height={40} className="h-10 w-10 rounded-lg object-cover" />
                            ) : (
                              <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${getAvatarGradient(memberProfile?.full_name || 'U')} text-sm font-bold text-white`}>
                                {memberProfile?.avatar || 'U'}
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span className="text-xs text-slate-500">{memberProfile?.full_name ?? 'Unassigned'}</span>
                                <span className={`rounded px-2 py-0.5 text-xs ${detail.location === 'on-site' ? 'bg-blue-500/20 text-blue-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                                  {detail.location === 'on-site' ? 'On-Site' : 'Remote'}
                                </span>
                                <span className={`rounded-full px-2 py-0.5 text-xs ${detail.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : detail.status === 'open' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-500/20 text-blue-300'}`}>
                                  {detail.status === 'pending' ? 'Pending' : detail.status === 'open' ? 'Open' : 'Closed'}
                                </span>
                              </div>

                              <p className="mb-3 text-sm text-slate-300">{detail.issue}</p>

                              <div className="mb-3 flex flex-wrap gap-2 text-xs">
                                {detail.ticket_type && <span className="rounded bg-slate-700 px-2 py-0.5 text-slate-300">{detail.ticket_type}</span>}
                                {detail.estate_or_building && <span className="rounded bg-slate-700 px-2 py-0.5 text-slate-300">{detail.estate_or_building}</span>}
                                {detail.cml_location && <span className="rounded bg-slate-700 px-2 py-0.5 text-slate-300">{detail.cml_location}</span>}
                                {detail.has_dependencies && detail.dependency_name && (
                                  <span className="rounded bg-blue-500/20 px-2 py-0.5 text-blue-400">{detail.dependency_name}</span>
                                )}
                                <span className="rounded bg-slate-700/50 px-2 py-0.5 text-slate-400">
                                  Assigned: {assignedProfiles.length > 0 ? assignedProfiles.map((profile) => profile.full_name).join(', ') : 'No members assigned'}
                                </span>
                              </div>

                              <div className="mb-4 rounded-xl border border-slate-700/50 bg-slate-900/60 p-4">
                                <div className="mb-3 flex items-center justify-between">
                                  <p className="text-sm font-medium text-slate-200">Assign Members</p>
                                  <button type="button" onClick={() => setAssigningTicketId(assigningTicketId === ticket.id ? null : ticket.id)} className="rounded-lg bg-blue-500/20 px-3 py-1 text-xs text-blue-400 hover:bg-blue-500/30">
                                    {assigningTicketId === ticket.id ? 'Done' : 'Manage Assignees'}
                                  </button>
                                </div>

                                {assigningTicketId === ticket.id && (
                                  <div className="space-y-2">
                                    {profiles.filter((profile) => profile.id !== ticket.user_id).map((profile) => {
                                      const isAssigned = assignedIds.includes(profile.id);

                                      return (
                                        <label key={profile.id} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-slate-800/50">
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
                                                await loadTickets();
                                                setAssigningTicketId(null);
                                              }
                                            }}
                                            className="h-4 w-4 rounded border-slate-700"
                                            style={{ accentColor: '#1e3a5f' }}
                                          />

                                          {profile.avatar_url ? (
                                            <Image src={profile.avatar_url} alt={profile.full_name} width={24} height={24} className="h-6 w-6 rounded-lg object-cover" />
                                          ) : (
                                            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white">
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
                                <div className="mb-4 rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
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

                              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                                <p className="mb-1 text-xs text-amber-400">Add admin comment</p>
                                {adminCommentTicketId === ticket.id ? (
                                  <>
                                    <textarea
                                      value={adminCommentText}
                                      onChange={(event) => setAdminCommentText(event.target.value)}
                                      placeholder="Comment visible to member"
                                      rows={2}
                                      className="w-full rounded bg-slate-900 px-2 py-1.5 text-xs text-white placeholder-slate-500"
                                    />
                                    <div className="mt-2 flex gap-2">
                                      <button type="button" onClick={() => void handleAddAdminComment(ticket.id)} disabled={!adminCommentText.trim() || adminCommentSubmitting} className="rounded bg-amber-500/30 px-2 py-1 text-xs font-medium text-amber-300 disabled:opacity-50">
                                        {adminCommentSubmitting ? 'Adding...' : 'Add comment'}
                                      </button>
                                      <button type="button" onClick={() => { setAdminCommentTicketId(null); setAdminCommentText(''); }} className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-300">
                                        Cancel
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <button type="button" onClick={() => { setAdminCommentTicketId(ticket.id); setAdminCommentText(''); }} className="rounded bg-amber-500/20 px-2 py-1 text-xs text-amber-300 hover:bg-amber-500/30">
                                    + Add admin comment
                                  </button>
                                )}
                              </div>

                              <p className="mt-3 text-xs text-slate-600">
                                Created: {new Date(detail.created_at).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                {detail.closed_at && <> • Closed: {new Date(detail.closed_at).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</>}
                                {detail.response_time_minutes && detail.response_time_minutes > 0 && <> • Response: {detail.response_time_minutes} min</>}
                              </p>
                            </div>

                            <button type="button" onClick={() => void handleDeleteTicket(ticket.id)} className="shrink-0 rounded-lg bg-blue-500/10 p-2 text-blue-400 hover:bg-blue-500/20" title="Delete ticket">
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

            {!loadingTickets && tickets.length > 0 && (
              <div className="flex justify-center pt-2">
                <button type="button" onClick={() => void loadMoreTickets()} disabled={loadingMoreTickets} className="rounded-xl bg-slate-700 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50">
                  {loadingMoreTickets ? 'Loading…' : 'Load Next 30'}
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
