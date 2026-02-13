'use client';
// Admin dashboard page

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { supabase, getAllProfiles, getAllTickets, createTicket, deleteTicket, uploadProfilePicture, Profile, Ticket, getAllTravelLogs, TravelLog, updateTicket, addTicketAdminComment, createNotificationsForNewAssignments } from '../lib/supabase';
import Link from 'next/link';
import Image from 'next/image';
import Logo from '../components/Logo';
import AIInsightsPanel from '../components/AIInsightsPanel';
import WorkspaceLoader from '../components/WorkspaceLoader';
import ExportsPanel from '../components/ExportsPanel';

export default function AdminPage() {
  const router = useRouter();
  const { user, profile, loading, isAdmin, signOut } = useAuth();
  
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [travelLogs, setTravelLogs] = useState<TravelLog[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showExportsPanel, setShowExportsPanel] = useState(false);
  const [showImageLinks, setShowImageLinks] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterUser, setFilterUser] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed'>('all');
  const [filterIssueSearch, setFilterIssueSearch] = useState('');
  const [adminTab, setAdminTab] = useState<'tickets' | 'travelLogs' | 'aiInsights'>('tickets');
  
  const [newTicketData, setNewTicketData] = useState({
    issue: '',
    location: 'remote' as 'on-site' | 'remote',
    client: '',
    clickupTicket: '',
    ticketType: '' as 'Hardware' | 'Software' | '',
    severity: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
    estateOrBuilding: '',
    cmlLocation: ''
  });

  // Profile picture upload state
  const [uploadingFor, setUploadingFor] = useState<Profile | null>(null);
  const [uploading, setUploading] = useState(false);

  // User management state
  const [showUserManagement, setShowUserManagement] = useState(false);

  // ClickUp ticket edit state
  const [editingClickUpTicketId, setEditingClickUpTicketId] = useState<string | null>(null);
  const [clickUpTicketValue, setClickUpTicketValue] = useState('');
  
  // Assignment UI toggle state
  const [assigningTicketId, setAssigningTicketId] = useState<string | null>(null);
  const [expandedTickets, setExpandedTickets] = useState<Set<string>>(new Set());
  // FEATURE 3: Admin comment state (admin-only)
  const [adminCommentTicketId, setAdminCommentTicketId] = useState<string | null>(null);
  const [adminCommentText, setAdminCommentText] = useState('');
  const [adminCommentSubmitting, setAdminCommentSubmitting] = useState(false);
  // Redirect if not admin
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push('/dashboard');
    }
  }, [user, loading, isAdmin, router]);

  // Load data
  useEffect(() => {
    if (user && isAdmin) {
      loadData();
    }
  }, [user, isAdmin]);

  // Set default date range
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    setDateTo(today.toISOString().split('T')[0]);
    setDateFrom(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  // Performance: parallel fetch for tickets, team (profiles), travel logs; no blocking full-page spinner
  const loadData = async () => {
    setLoadingData(true);
    setExpandedTickets(new Set());
    try {
      const [profilesData, ticketsData, travelLogsData] = await Promise.all([
        getAllProfiles(),
        getAllTickets(),
        getAllTravelLogs(),
      ]);
      setProfiles(profilesData);
      setTickets(ticketsData);
      setTravelLogs(travelLogsData);
    } catch (err) {
      console.error('loadData: Error:', err);
    }
    setLoadingData(false);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !newTicketData.issue.trim() || !newTicketData.client.trim() || !newTicketData.ticketType || !newTicketData.estateOrBuilding.trim() || !newTicketData.cmlLocation.trim()) return;

    const { data, error } = await createTicket({
      user_id: selectedUserId,
      client: newTicketData.client.trim(),
      clickup_ticket: newTicketData.clickupTicket.trim() || undefined,
      location: newTicketData.location,
      issue: newTicketData.issue.trim(),
      created_by: user?.id,
      ticket_type: newTicketData.ticketType,
      severity: newTicketData.severity,
      estate_or_building: newTicketData.estateOrBuilding.trim(),
      cml_location: newTicketData.cmlLocation.trim()
    });

    if (!error && data) {
      await loadData();
      setNewTicketData({ issue: '', location: 'remote', client: '', clickupTicket: '', ticketType: '', severity: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT', estateOrBuilding: '', cmlLocation: '' });
      setSelectedUserId('');
      setShowCreateForm(false);
    }
  };

  const handleUpdateClickUpTicket = async (ticketId: string) => {
    try {
      const { error } = await updateTicket(ticketId, { clickup_ticket: clickUpTicketValue.trim() || undefined });
      if (!error) {
        await loadData();
        setEditingClickUpTicketId(null);
        setClickUpTicketValue('');
      } else {
        alert('Error updating ClickUp ticket: ' + (error.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Error updating ClickUp ticket: ' + ((err as Error)?.message || 'Unknown error'));
    }
  };

  /** FEATURE 3: Add admin comment (does not change ownership or status). */
  const handleAddAdminComment = async (ticketId: string) => {
    const text = adminCommentText.trim();
    if (!text || !user?.id) return;
    setAdminCommentSubmitting(true);
    try {
      const { error } = await addTicketAdminComment(ticketId, text, user.id);
      if (!error) {
        await loadData();
        setAdminCommentTicketId(null);
        setAdminCommentText('');
      } else {
        alert('Error adding comment: ' + (error.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Error: ' + ((err as Error)?.message || 'Unknown error'));
    } finally {
      setAdminCommentSubmitting(false);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) return;
    
    if (!user?.id) {
      alert('Error: User not authenticated');
      return;
    }
    
    try {
      console.log('Attempting to delete ticket:', ticketId, 'for user:', user.id);
      
      // Use API route with service role key (bypasses RLS)
      const response = await fetch('/api/admin/delete-ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId,
          userId: user.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Error deleting ticket:', result);
        alert(`Failed to delete ticket: ${result.error || 'Unknown error'}`);
        return;
      }
      
      console.log('Ticket deleted successfully:', result);
      
      // Remove from local state immediately for UI feedback
      setTickets(tickets.filter(t => t.id !== ticketId));
      
      // Reload tickets from database to ensure consistency
      await loadData();
      
      console.log('Tickets reloaded after deletion');
    } catch (err: any) {
      console.error('Exception deleting ticket:', err);
      alert('An unexpected error occurred while deleting the ticket: ' + (err?.message || 'Unknown error'));
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!uploadingFor || !e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setUploading(true);
    try {
      const { publicUrl, error } = await uploadProfilePicture(uploadingFor.id, file);

      if (error) {
        alert('Failed to upload image: ' + error.message);
        setUploading(false);
        return;
      }

      if (publicUrl) {
        // Add cache-busting parameter to force browser refresh
        const cacheBustUrl = `${publicUrl}?t=${Date.now()}`;
        
        // Update the profile in state immediately with cache-busted URL
        setProfiles(prevProfiles => 
          prevProfiles.map(p => 
            p.id === uploadingFor.id 
              ? { ...p, avatar_url: cacheBustUrl }
              : p
          )
        );
        
        // Reload all data to ensure consistency
        await loadData();
        
        // Show success message
        alert('Profile picture updated successfully!');
        
        // Close modal
        setUploadingFor(null);
      }
    } catch (err) {
      console.error('Error uploading profile picture:', err);
      alert('An unexpected error occurred while uploading the image.');
    } finally {
      setUploading(false);
    }
  };

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    if (filterUser !== 'all' && ticket.user_id !== filterUser) return false;
    if (filterStatus !== 'all' && ticket.status !== filterStatus) return false;
    const issueSearch = filterIssueSearch.trim().toLowerCase();
    if (issueSearch && !(ticket.issue || '').toLowerCase().includes(issueSearch)) return false;
    return true;
  });

  // Stats
  const totalOpen = tickets.filter(t => t.status === 'open').length;
  const totalClosed = tickets.filter(t => t.status === 'closed').length;
  const totalOnSite = tickets.filter(t => t.location === 'on-site').length;
  const totalRemote = tickets.filter(t => t.location === 'remote').length;

  // FEATURE A – Admin analytics: dependency-aware response time (reuse existing response_time_minutes logic).
  // "With dependencies" = has_dependencies AND dependency_name has content (length > 0).
  const hasDependencies = (t: Ticket) =>
    t.has_dependencies === true && (t.dependency_name?.trim()?.length ?? 0) > 0;
  const closedWithResponse = tickets.filter(
    (t) => t.status === 'closed' && t.response_time_minutes != null && t.response_time_minutes > 0
  );
  const closedNoDeps = closedWithResponse.filter((t) => !hasDependencies(t));
  const closedWithDeps = closedWithResponse.filter(hasDependencies);
  const avgResponseTimeNoDependencies =
    closedNoDeps.length > 0
      ? Math.round(
          closedNoDeps.reduce((sum, t) => sum + (t.response_time_minutes ?? 0), 0) / closedNoDeps.length
        )
      : 0;
  const avgResponseTimeWithDependencies =
    closedWithDeps.length > 0
      ? Math.round(
          closedWithDeps.reduce((sum, t) => sum + (t.response_time_minutes ?? 0), 0) / closedWithDeps.length
        )
      : 0;
  const overallAvgResponseTime =
    closedWithResponse.length > 0
      ? Math.round(
          closedWithResponse.reduce((sum, t) => sum + (t.response_time_minutes ?? 0), 0) /
            closedWithResponse.length
        )
      : 0;
  const ticketsHandled = totalClosed;

  const getAvatarGradient = (name: string) => {
    const colors = ['from-blue-400 to-blue-600', 'from-blue-500 to-indigo-600', 'from-indigo-400 to-blue-500', 'from-blue-600 to-cyan-500', 'from-cyan-400 to-blue-500'];
    return colors[name.charCodeAt(0) % colors.length];
  };

  // Debug overlay: only when not production (NEXT_PUBLIC_VERCEL_ENV set by Vercel at build; client-safe)
  const showDebugOverlay = (process.env.NEXT_PUBLIC_VERCEL_ENV ?? '') !== 'production';
  const debugInfo = showDebugOverlay ? (
    <div className="fixed bottom-4 right-4 p-4 bg-slate-800 border border-slate-600 rounded-xl text-xs font-mono z-50">
      <p className="text-slate-400">Debug Info:</p>
      <p className={loading ? 'text-blue-400' : 'text-blue-300'}>loading: {String(loading)}</p>
      <p className={!user ? 'text-blue-400' : 'text-blue-300'}>user: {user ? 'yes' : 'no'}</p>
      <p className={!profile ? 'text-blue-400' : 'text-blue-300'}>profile: {profile ? 'yes' : 'no'}</p>
      <p className={!isAdmin ? 'text-blue-400' : 'text-blue-300'}>isAdmin: {String(isAdmin)}</p>
      <p className={loadingData ? 'text-blue-400' : 'text-blue-300'}>loadingData: {String(loadingData)}</p>
    </div>
  ) : null;

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center flex-col gap-4">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400">Checking authentication...</p>
        {debugInfo}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center flex-col gap-4">
        <p className="text-slate-400">No user found.</p>
        <Link href="/login" className="text-blue-400">Go to Login</Link>
        {debugInfo}
      </div>
    );
  }

  // Progressive loading: show main layout; branded loader overlay while data loads (no global block)
  return (
    <div className="min-h-screen bg-slate-950 bg-grid-pattern bg-radial-gradient">
      <WorkspaceLoader active={loadingData} />
      {debugInfo}
      {/* FEATURE B: Header – logo + admin identity as one block; action buttons in row below */}
      <header className="sticky top-0 z-40 glass border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          {/* Row 1: Think Q logo immediately next to admin profile, name, designation */}
          <div className="flex items-center gap-4 flex-wrap">
            <Link href="/dashboard" className="flex-shrink-0">
              <Logo variant="team" className="opacity-90 hover:opacity-100 transition-opacity" />
            </Link>
            <Link href="/dashboard" className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="relative group flex-shrink-0">
              {profile?.avatar_url ? (
                <Image src={profile.avatar_url} alt={profile.full_name} width={48} height={48} className="w-12 h-12 rounded-xl object-cover shadow-lg" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg">
                  {profile?.avatar || 'A'}
                </div>
              )}
              {profile && (
                <button
                  onClick={() => setUploadingFor(profile)}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-400"
                  title="Upload profile picture"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}
            </div>
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-white">{profile?.full_name || 'Admin'}</h1>
              <p className="text-sm text-slate-400">{profile?.role || 'Administrator'} • Admin</p>
            </div>
          </div>
          {/* Row 2: All admin action buttons */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button onClick={() => setShowUserManagement(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Manage Users
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowExportsPanel((v) => !v)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Exports
              </button>
              {showExportsPanel && (
                <>
                  <div className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setShowExportsPanel(false)} />
                  <ExportsPanel
                    isAdmin={true}
                    onClose={() => setShowExportsPanel(false)}
                    getAuthHeaders={async () => {
                      const { data: { session } } = await supabase.auth.getSession();
                      const headers: HeadersInit = {};
                      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
                      return headers;
                    }}
                    memberOptions={profiles.map((p) => ({ id: p.id, full_name: p.full_name }))}
                  />
                </>
              )}
            </div>
            <button onClick={() => setShowImageLinks(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white hover:opacity-90 transition-all" style={{ backgroundColor: '#1e3a5f', border: '1px solid rgba(30, 58, 95, 0.3)' }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              View All Images
            </button>
            <button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium shadow-lg hover:shadow-blue-500/25 transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Ticket
            </button>
            <Link href="/admin/notifications" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30 transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Notification Centre
            </Link>
            <button onClick={handleSignOut} className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats: single horizontal row, flex nowrap, cards scale to fit */}
        <section className="mb-8 flex flex-row flex-nowrap gap-2 md:gap-4 w-full min-w-0">
          <div className="flex-1 min-w-0 p-2 sm:p-3 md:p-4 lg:p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
            <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5 md:mb-1 break-words">Total Tickets</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight">{tickets.length}</p>
          </div>
          <div className="flex-1 min-w-0 p-2 sm:p-3 md:p-4 lg:p-5 rounded-2xl bg-blue-500/10 border border-blue-500/30">
            <p className="text-[10px] sm:text-xs text-blue-400 mb-0.5 md:mb-1 break-words">Open</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-400 leading-tight">{totalOpen}</p>
          </div>
          <div className="flex-1 min-w-0 p-2 sm:p-3 md:p-4 lg:p-5 rounded-2xl bg-blue-500/10 border border-blue-500/30">
            <p className="text-[10px] sm:text-xs text-blue-300 mb-0.5 md:mb-1 break-words">Closed</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-300 leading-tight">{totalClosed}</p>
          </div>
          <div className="flex-1 min-w-0 p-2 sm:p-3 md:p-4 lg:p-5 rounded-2xl bg-blue-500/10 border border-blue-500/30">
            <p className="text-[10px] sm:text-xs text-blue-400 mb-0.5 md:mb-1 break-words">Avg Response Time</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-400 leading-tight">{overallAvgResponseTime}</p>
            <p className="text-[10px] sm:text-xs text-blue-300 mt-0.5 md:mt-1 break-words">{overallAvgResponseTime > 0 ? 'minutes' : 'No data'}</p>
          </div>
          {/* FEATURE A: Dependency-aware response time (admin analytics only) */}
          <div className="flex-1 min-w-0 p-2 sm:p-3 md:p-4 lg:p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
            <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5 md:mb-1 break-words" title="Average Response Time (No Dependencies)">Avg (No Deps)</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight">{avgResponseTimeNoDependencies}</p>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 md:mt-1 break-words">{avgResponseTimeNoDependencies > 0 ? 'min' : 'No data'}</p>
          </div>
          <div className="flex-1 min-w-0 p-2 sm:p-3 md:p-4 lg:p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
            <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5 md:mb-1 break-words" title="Average Response Time (With Dependencies)">Avg (With Deps)</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight">{avgResponseTimeWithDependencies}</p>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 md:mt-1 break-words">{avgResponseTimeWithDependencies > 0 ? 'min' : 'No data'}</p>
          </div>
        </section>

        {/* Team Members */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Team Members</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {profiles.map(p => {
              const memberTickets = tickets.filter(t => t.user_id === p.id);
              const openCount = memberTickets.filter(t => t.status === 'open').length;
              const closedCount = memberTickets.filter(t => t.status === 'closed').length;
              
              // Calculate per-member KPI metrics
              const memberClosedTickets = memberTickets.filter(t => t.status === 'closed');
              const memberTicketsWithResponseTime = memberClosedTickets.filter(t => 
                t.response_time_minutes && t.response_time_minutes > 0
              );
              const memberAvgResponseTime = memberTicketsWithResponseTime.length > 0
                ? Math.round(
                    memberTicketsWithResponseTime.reduce((sum, t) => sum + (t.response_time_minutes || 0), 0) / 
                    memberTicketsWithResponseTime.length
                  )
                : 0;
              const memberTicketsHandled = closedCount;
              
              return (
                <div key={p.id} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative">
                      {p.avatar_url ? (
                        <Image src={p.avatar_url} alt={p.full_name} width={40} height={40} className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getAvatarGradient(p.full_name)} flex items-center justify-center text-white font-bold text-sm`}>
                          {p.avatar}
                        </div>
                      )}
                      <button 
                        onClick={() => setUploadingFor(p)}
                        className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-400"
                        title="Upload profile picture"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{p.full_name.split(' ')[0]}</p>
                      <p className="text-xs text-slate-500 truncate">{p.role}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-blue-400">{openCount} open</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-blue-300">{closedCount} closed</span>
                    </div>
                    <div className="pt-2 border-t border-slate-700/50 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Handled:</span>
                        <span className="text-blue-400 font-semibold">{memberTicketsHandled}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Avg Response:</span>
                        <span className="text-blue-400 font-semibold">
                          {memberAvgResponseTime > 0 ? `${memberAvgResponseTime}m` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {p.is_admin && <span className="mt-2 inline-block px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">Admin</span>}
                </div>
              );
            })}
          </div>
        </section>

        {/* Admin Tabs - Tickets and Travel Logs */}
        <div className="mb-6">
          <div className="flex gap-2 p-1 bg-slate-800/50 rounded-xl w-fit">
            <button
              onClick={() => {
                setAdminTab('tickets');
                setExpandedTickets(new Set()); // Collapse all tickets when switching to tickets tab
              }}
              className={`px-6 py-3 rounded-lg text-sm font-medium transition-all ${
                adminTab === 'tickets' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Tickets
            </button>
            <button
              onClick={() => {
                setAdminTab('travelLogs');
                setExpandedTickets(new Set()); // Collapse all tickets when switching tabs
              }}
              className={`px-6 py-3 rounded-lg text-sm font-medium transition-all ${
                adminTab === 'travelLogs' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Travel Logs
            </button>
            <button
              onClick={() => setAdminTab('aiInsights')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all ${
                adminTab === 'aiInsights' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Ask<span className="inline-block w-2 shrink-0" aria-hidden /><Logo variant="team" className="h-5 w-auto" width={72} height={18} />
            </button>
          </div>
        </div>

        {/* Ask tab – premium intelligence assistant */}
        {adminTab === 'aiInsights' && (
          <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50">
            <AIInsightsPanel
              filters={{
                ...(dateFrom ? { dateFrom } : {}),
                ...(dateTo ? { dateTo } : {}),
                ...(filterUser !== 'all' ? { userId: filterUser } : {}),
              }}
            />
          </div>
        )}

        {/* Tickets Tab */}
        {adminTab === 'tickets' && (
          <div>
            {/* Filters */}
            <section className="mb-6 flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Filter by Member</label>
            <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm">
              <option value="all">All Members</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Filter by Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as 'all' | 'open' | 'closed')} className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm">
              <option value="all">All Status</option>
              <option value="open">Open Only</option>
              <option value="closed">Closed Only</option>
            </select>
          </div>
          <div className="min-w-[200px]">
            <label className="block text-xs text-slate-500 mb-1">Search issue description</label>
            <input
              type="text"
              value={filterIssueSearch}
              onChange={(e) => setFilterIssueSearch(e.target.value)}
              placeholder="Search in issue..."
              className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div className="ml-auto text-sm text-slate-400">
            Showing {filteredTickets.length} of {tickets.length} tickets
          </div>
        </section>

        {/* Tickets List */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">All Tickets</h2>
          {filteredTickets.length === 0 ? (
            <div className="text-center py-12 rounded-2xl bg-slate-800/30 border border-slate-700/30">
              <p className="text-slate-500">No tickets found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTickets.map(ticket => {
                const memberProfile = profiles.find(p => p.id === ticket.user_id);
                const isExpanded = expandedTickets.has(ticket.id);
                return (
                  <div key={ticket.id} className={`p-4 rounded-xl border ${ticket.status === 'open' ? 'bg-slate-800/40 border-blue-500/30' : 'bg-slate-800/30 border-slate-700/50'}`}>
                    {/* Collapsed Header - Always Visible */}
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => {
                        const newExpanded = new Set(expandedTickets);
                        if (isExpanded) {
                          newExpanded.delete(ticket.id);
                        } else {
                          newExpanded.add(ticket.id);
                        }
                        setExpandedTickets(newExpanded);
                      }}
                    >
                      <div className="flex items-center flex-wrap gap-2 flex-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${ticket.status === 'open' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-300'}`}>
                          {ticket.ticket_number}
                        </span>
                        {ticket.client && <span className="px-2 py-0.5 rounded text-xs bg-slate-700 text-slate-300">{ticket.client}</span>}
                        {ticket.estate_or_building ? (
                          <span className="px-2 py-0.5 rounded text-xs bg-slate-700/70 text-slate-300">{ticket.estate_or_building}</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-xs bg-slate-700/50 text-slate-400 opacity-50">No Estate/Building</span>
                        )}
                        {ticket.severity && (
                          <span className={`px-2 py-0.5 rounded border text-xs font-medium ${
                            ticket.severity === 'LOW' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                            ticket.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                            ticket.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                            'bg-red-500/20 text-red-400 border-red-500/30'
                          }`}>
                            {ticket.severity}
                          </span>
                        )}
                      </div>
                      {!isExpanded && (
                        <div className="mt-2 text-sm text-slate-400 line-clamp-1">
                          {ticket.issue}
                        </div>
                      )}
                      <button className="ml-2 p-1 rounded-lg hover:bg-slate-700/50 transition-colors">
                        <svg 
                          className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>

                    {/* Expanded Content - Only visible when expanded */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-700/50">
                        <div className="flex items-start gap-4">
                          {memberProfile?.avatar_url ? (
                            <Image src={memberProfile.avatar_url} alt={memberProfile.full_name} width={40} height={40} className="w-10 h-10 rounded-lg object-cover" />
                          ) : (
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getAvatarGradient(memberProfile?.full_name || 'U')} flex items-center justify-center text-white font-bold text-sm`}>
                              {memberProfile?.avatar || 'U'}
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center flex-wrap gap-2 mb-2">
                              <span className="text-xs text-slate-500">{memberProfile?.full_name}</span>
                          {editingClickUpTicketId === ticket.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={clickUpTicketValue}
                                onChange={(e) => setClickUpTicketValue(e.target.value)}
                                placeholder="Enter ClickUp ticket ID..."
                                className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:border-blue-500 outline-none"
                                style={{ minWidth: '180px' }}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleUpdateClickUpTicket(ticket.id);
                                  } else if (e.key === 'Escape') {
                                    setEditingClickUpTicketId(null);
                                    setClickUpTicketValue('');
                                  }
                                }}
                              />
                              <button
                                onClick={() => handleUpdateClickUpTicket(ticket.id)}
                                className="px-2 py-1 rounded-lg bg-blue-500 text-white text-xs hover:bg-blue-600"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingClickUpTicketId(null);
                                  setClickUpTicketValue('');
                                }}
                                className="px-2 py-1 rounded-lg bg-slate-700 text-slate-300 text-xs hover:bg-slate-600"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            ticket.clickup_ticket ? (
                              <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400 flex items-center gap-1">
                                🔗 {ticket.clickup_ticket}
                                {ticket.status === 'open' && (
                                  <button
                                    onClick={() => {
                                      setEditingClickUpTicketId(ticket.id);
                                      setClickUpTicketValue(ticket.clickup_ticket || '');
                                    }}
                                    className="ml-1 hover:opacity-70"
                                    title="Edit ClickUp ticket"
                                  >
                                    ✏️
                                  </button>
                                )}
                              </span>
                            ) : (
                              ticket.status === 'open' && (
                                <button
                                  onClick={() => {
                                    setEditingClickUpTicketId(ticket.id);
                                    setClickUpTicketValue('');
                                  }}
                                  className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 flex items-center gap-1"
                                >
                                  + Add ClickUp
                                </button>
                              )
                            )
                          )}
                          <span className={`px-2 py-0.5 rounded text-xs ${ticket.location === 'on-site' ? 'bg-blue-500/20 text-blue-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                            {ticket.location === 'on-site' ? '📍 On-Site' : '🌐 Remote'}
                          </span>
                          {ticket.severity && (
                            <span className={`px-2 py-0.5 rounded border text-xs font-medium ${
                              ticket.severity === 'LOW' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                              ticket.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                              ticket.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                              'bg-red-500/20 text-red-400 border-red-500/30'
                            }`}>
                              {ticket.severity}
                            </span>
                          )}
                          {/* Always show assigned members if any */}
                          {/* ClickUp ticket edit is available for open tickets */}
                          {(ticket as any).assigned_profiles && (ticket as any).assigned_profiles.length > 0 ? (
                            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs flex items-center gap-1">
                              👤 Assigned: {(ticket as any).assigned_profiles.map((p: Profile) => p.full_name).join(', ')}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-700/50 text-slate-400 text-xs">
                              👤 No members assigned
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-xs ${ticket.status === 'open' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-500/20 text-blue-300'}`}>
                            {ticket.status === 'open' ? 'Open' : 'Closed'}
                          </span>
                          {(() => {
                            const assignedArray = Array.isArray((ticket as any).assigned_to) ? (ticket as any).assigned_to : ((ticket as any).assigned_to ? [(ticket as any).assigned_to] : []);
                            const isAssigned = assignedArray.includes(user?.id || '');
                            const canAssign = isAdmin || isAssigned;
                            if (!canAssign) return null;
                            return profiles.length > 0 ? (
                              <button
                                onClick={() => {
                                  setAssigningTicketId(assigningTicketId === ticket.id ? null : ticket.id);
                                }}
                                className="px-3 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-xs hover:bg-blue-500/30 transition-colors"
                              >
                                {assignedArray.length > 0 ? 'Manage Assignees' : 'Assign Members'}
                              </button>
                            ) : (
                              <span className="px-3 py-1 rounded-lg bg-slate-700/50 text-slate-400 text-xs">
                                Loading...
                              </span>
                            );
                          })()}
                        </div>
                        
                        <p className="text-sm text-slate-300 mb-2">{ticket.issue}</p>
                        
                        {/* Assignment UI - Visible to admins and assigned members - Only shows when button clicked */}
                        {assigningTicketId === ticket.id && (() => {
                          const assignedArray = Array.isArray((ticket as any).assigned_to) ? (ticket as any).assigned_to : ((ticket as any).assigned_to ? [(ticket as any).assigned_to] : []);
                          const isAssigned = assignedArray.includes(user?.id || '');
                          const canAccessAssignment = isAdmin || isAssigned;
                          if (!canAccessAssignment) return null;
                          if (profiles.length === 0) {
                            return (
                              <div className="mb-4 p-4 rounded-xl bg-slate-900/50 border border-slate-700/50">
                                <p className="text-sm text-slate-400">Loading members...</p>
                              </div>
                            );
                          }
                          return (
                            <div className="mb-4 p-4 rounded-xl bg-slate-900/50 border border-slate-700/50">
                              <div className="flex items-center justify-between mb-3">
                                <label className="block text-sm font-medium text-slate-300">Assign Members</label>
                                <button
                                  onClick={() => setAssigningTicketId(null)}
                                  className="px-3 py-1 rounded-lg bg-slate-700 text-slate-300 text-xs hover:bg-slate-600"
                                >
                                  Done
                                </button>
                              </div>
                              <div className="space-y-2 max-h-60 overflow-y-auto">
                                {profiles.filter(p => p.id !== ticket.user_id).map(p => {
                                  const assignedArray = Array.isArray((ticket as any).assigned_to) ? (ticket as any).assigned_to : ((ticket as any).assigned_to ? [(ticket as any).assigned_to] : []);
                                  const isAssigned = assignedArray.includes(p.id);
                                  const canRemove = isAdmin; // Only admins can remove in admin view
                                  const isDisabled = isAssigned && !canRemove; // Disable checkbox if trying to remove and not admin
                                  
                                  return (
                                    <label key={p.id} className={`flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                                      <input
                                        type="checkbox"
                                        checked={isAssigned}
                                        onChange={async (e) => {
                                          if (!e.target.checked && !isAdmin) {
                                            alert('Only admins can remove assigned members.');
                                            return;
                                          }
                                          
                                          const currentAssigned = Array.isArray((ticket as any).assigned_to) ? (ticket as any).assigned_to : ((ticket as any).assigned_to ? [(ticket as any).assigned_to] : []);
                                          let newAssigned: string[];
                                          if (e.target.checked) {
                                            newAssigned = currentAssigned.includes(p.id) ? currentAssigned : [...currentAssigned, p.id];
                                          } else {
                                            newAssigned = currentAssigned.filter((id: string) => id !== p.id);
                                          }
                                          const { error } = await updateTicket(ticket.id, { assigned_to: newAssigned });
                                          if (!error) {
                                            // FEATURE C: Notify newly assigned members (excludes current admin)
                                            await createNotificationsForNewAssignments(ticket.id, currentAssigned, newAssigned, user?.id ?? '', 'admin');
                                            await loadData();
                                            // Close assignment UI after successful assignment
                                            if (assigningTicketId === ticket.id) {
                                              setAssigningTicketId(null);
                                            }
                                          } else {
                                            console.error('Error assigning ticket:', error);
                                            alert('Error updating assignment: ' + ((error as Error)?.message || 'Unknown error'));
                                          }
                                        }}
                                        disabled={isDisabled}
                                        className="w-4 h-4 rounded border-slate-700 disabled:cursor-not-allowed"
                                        style={{ accentColor: '#1e3a5f' }}
                                      />
                                      <div className="flex items-center gap-2 flex-1">
                                        {p.avatar_url ? (
                                          <Image src={p.avatar_url} alt={p.full_name} width={24} height={24} className="w-6 h-6 rounded-lg object-cover" />
                                        ) : (
                                          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                                            {p.avatar}
                                          </div>
                                        )}
                                        <span className="text-sm text-slate-300">{p.full_name}</span>
                                        {p.role && <span className="text-xs text-slate-500">({p.role})</span>}
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Show ticket details */}
                        <div className="flex flex-wrap gap-2 mb-2 text-xs">
                          {ticket.ticket_type && (
                            <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                              {ticket.ticket_type === 'Hardware' ? '🔧' : ticket.ticket_type === 'Software' ? '💻' : ticket.ticket_type === 'New Site' ? '🏗' : ''} {ticket.ticket_type}
                            </span>
                          )}
                          {ticket.estate_or_building && (
                            <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300">{ticket.estate_or_building}</span>
                          )}
                          {ticket.cml_location && (
                            <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300">📍 {ticket.cml_location}</span>
                          )}
                          {ticket.has_dependencies && (
                            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">⚠️ {ticket.dependency_name}</span>
                          )}
                        </div>

                        {/* Show Updates (member updates and FEATURE 3: admin comments) */}
                        {ticket.updates && ticket.updates.length > 0 && (
                          <div className="mt-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <p className="text-xs text-blue-400 mb-2">Updates ({ticket.updates.length}):</p>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {ticket.updates.map((update: any, idx: number) => (
                                <div key={idx} className={`text-xs ${update.authorRole === 'admin' ? 'pl-2 border-l-2 border-amber-500/50' : ''}`}>
                                  {update.authorRole === 'admin' && <span className="text-amber-400 font-medium mr-1">Admin comment:</span>}
                                  <span className="text-blue-300">[{new Date(update.timestamp).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}]</span>
                                  <span className="text-slate-300 ml-1">{update.text}</span>
                                  {update.attachments && update.attachments.length > 0 && (
                                    <div className="mt-1 ml-6 flex flex-wrap gap-1">
                                      {update.attachments.map((attachment: { url: string; name: string; type: string }, attIdx: number) => (
                                        <a
                                          key={attIdx}
                                          href={attachment.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="px-2 py-0.5 rounded text-[10px] hover:opacity-80 transition-colors inline-flex items-center gap-1"
                                          style={{ backgroundColor: 'rgba(30, 58, 95, 0.3)', color: '#60a5fa' }}
                                        >
                                          {attachment.type.startsWith('image/') ? '🖼️' : '📎'}
                                          <span className="max-w-[100px] truncate">{attachment.name}</span>
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* FEATURE 3: Add admin comment (admin-only; does not change ownership or status) */}
                        <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <p className="text-xs text-amber-400 mb-1">Add admin comment</p>
                          {adminCommentTicketId === ticket.id ? (
                            <div>
                              <textarea
                                value={adminCommentText}
                                onChange={(e) => setAdminCommentText(e.target.value)}
                                placeholder="Comment (visible to member)"
                                rows={2}
                                className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-600 text-white text-xs placeholder-slate-500"
                              />
                              <div className="flex gap-2 mt-1">
                                <button
                                  type="button"
                                  onClick={() => handleAddAdminComment(ticket.id)}
                                  disabled={!adminCommentText.trim() || adminCommentSubmitting}
                                  className="px-2 py-1 rounded bg-amber-500/30 text-amber-300 text-xs font-medium disabled:opacity-50"
                                >
                                  {adminCommentSubmitting ? 'Adding...' : 'Add comment'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setAdminCommentTicketId(null); setAdminCommentText(''); }}
                                  className="px-2 py-1 rounded bg-slate-700 text-slate-300 text-xs"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => { setAdminCommentTicketId(ticket.id); setAdminCommentText(''); }}
                              className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 text-xs hover:bg-amber-500/30"
                            >
                              + Add admin comment
                            </button>
                          )}
                        </div>

                        {/* Show Time Tracked */}
                        {(ticket.total_time_minutes || (ticket.time_logs && ticket.time_logs.length > 0)) && (
                          <div className="mt-2 p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs text-violet-400">⏱️ Time Tracked</p>
                              <span className="text-xs font-bold text-violet-300">
                                {ticket.total_time_minutes ? `${Math.floor(ticket.total_time_minutes / 60)}h ${ticket.total_time_minutes % 60}m` : '0m'}
                              </span>
                            </div>
                            {ticket.time_logs && ticket.time_logs.length > 0 && (
                              <div className="space-y-1 max-h-20 overflow-y-auto">
                                {ticket.time_logs.map((log: { minutes: number; description: string; timestamp: string; logged_by?: string }, idx: number) => (
                                  <div key={idx} className="text-xs">
                                    <span className="text-violet-300">{log.minutes}m</span>
                                    <span className="text-slate-400 mx-1">-</span>
                                    <span className="text-slate-300">{log.description}</span>
                                    {log.logged_by && <span className="text-slate-500 ml-1">({log.logged_by})</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {ticket.status === 'closed' && ticket.resolution && (
                          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 mt-2">
                            <p className="text-xs text-blue-400 mb-1">Resolution:</p>
                            <p className="text-sm text-slate-300">{ticket.resolution}</p>
                          </div>
                        )}
                        
                        <p className="text-xs text-slate-600 mt-2">
                          Created: {new Date(ticket.created_at).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {ticket.closed_at && <> • Closed: {new Date(ticket.closed_at).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</>}
                          {ticket.response_time_minutes && ticket.response_time_minutes > 0 && <> • Response: {ticket.response_time_minutes} min</>}
                        </p>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteTicket(ticket.id)}
                        className="shrink-0 p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                        title="Delete ticket"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
          </div>
        )}

        {/* Travel Logs Tab */}
        {adminTab === 'travelLogs' && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">All Travel Logs</h2>
            {travelLogs.length === 0 ? (
              <div className="text-center py-12 rounded-2xl bg-slate-800/30 border border-slate-700/30">
                <p className="text-slate-500">No travel logs found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {travelLogs.map(log => {
                  const memberProfile = profiles.find(p => p.id === log.user_id);
                  return (
                    <div key={log.id} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-base font-semibold text-white">{log.reason}</h3>
                            {log.distance_travelled && (
                              <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">
                                {log.distance_travelled} km {log.is_return_trip && '(Return)'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                            {memberProfile && (
                              <span className="flex items-center gap-1">
                                <Image 
                                  src={memberProfile.avatar_url || ''} 
                                  alt={memberProfile.full_name} 
                                  width={16} 
                                  height={16} 
                                  className="w-4 h-4 rounded-full"
                                />
                                {memberProfile.full_name}
                              </span>
                            )}
                            <span>•</span>
                            <span>{new Date(log.created_at).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          {log.start_address && (
                            <p className="text-sm text-slate-300 mb-1">
                              <span className="text-slate-500">From:</span> {log.start_address}
                            </p>
                          )}
                          {log.end_address && (
                            <p className="text-sm text-slate-300 mb-1">
                              <span className="text-slate-500">To:</span> {log.end_address}
                            </p>
                          )}
                          {log.comments && (
                            <p className="text-sm text-slate-400 mt-2">{log.comments}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Create Ticket Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreateForm(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="w-full max-w-lg bg-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-700/50 sticky top-0 bg-slate-900">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Create Ticket</h2>
                  <button onClick={() => setShowCreateForm(false)} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleCreateTicket} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Assign to <span className="text-blue-400">*</span></label>
                  <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} required className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white">
                    <option value="">Select a team member...</option>
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Client <span className="text-blue-400">*</span></label>
                  <select
                    value={newTicketData.client}
                    onChange={(e) => setNewTicketData({ ...newTicketData, client: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white appearance-none cursor-pointer"
                  >
                    <option value="">Select a client...</option>
                    <option value="Redefine">Redefine</option>
                    <option value="Balwin">Balwin</option>
                    <option value="Go Waterfall">Go Waterfall</option>
                    <option value="Go City">Go City</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Type <span className="text-blue-400">*</span></label>
                  <select
                    value={newTicketData.ticketType}
                    onChange={(e) => setNewTicketData({ ...newTicketData, ticketType: e.target.value as 'Hardware' | 'Software' | '' })}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white appearance-none cursor-pointer"
                  >
                    <option value="">Select type...</option>
                    <option value="Hardware">🔧 Hardware</option>
                    <option value="Software">💻 Software</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Severity <span className="text-blue-400">*</span></label>
                  <select
                    value={newTicketData.severity}
                    onChange={(e) => setNewTicketData({ ...newTicketData, severity: e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' })}
                    required
                    className={`w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 appearance-none cursor-pointer font-medium ${
                      newTicketData.severity === 'LOW' ? 'text-emerald-400' : 
                      newTicketData.severity === 'MEDIUM' ? 'text-yellow-400' :
                      newTicketData.severity === 'HIGH' ? 'text-orange-400' :
                      newTicketData.severity === 'URGENT' ? 'text-red-400' : 'text-white'
                    }`}
                  >
                    <option value="LOW" className="text-emerald-400">Low</option>
                    <option value="MEDIUM" className="text-yellow-400">Medium</option>
                    <option value="HIGH" className="text-orange-400">High</option>
                    <option value="URGENT" className="text-red-400">URGENT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Estate or Building <span className="text-blue-400">*</span></label>
                  <input
                    type="text"
                    value={newTicketData.estateOrBuilding}
                    onChange={(e) => setNewTicketData({ ...newTicketData, estateOrBuilding: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white"
                    placeholder="Enter estate or building name..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Location <span className="text-blue-400">*</span></label>
                  <p className="text-xs text-slate-500 mb-2">as per CML</p>
                  <input
                    type="text"
                    value={newTicketData.cmlLocation}
                    onChange={(e) => setNewTicketData({ ...newTicketData, cmlLocation: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white"
                    placeholder="Enter location..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">ClickUp Ticket <span className="text-slate-500">(optional)</span></label>
                  <input type="text" value={newTicketData.clickupTicket} onChange={(e) => setNewTicketData({ ...newTicketData, clickupTicket: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white" placeholder="Enter ClickUp ticket ID..." />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Location</label>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setNewTicketData({ ...newTicketData, location: 'on-site' })} className={`flex-1 px-4 py-3 rounded-xl border ${newTicketData.location === 'on-site' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>📍 On-Site</button>
                    <button type="button" onClick={() => setNewTicketData({ ...newTicketData, location: 'remote' })} className={`flex-1 px-4 py-3 rounded-xl border ${newTicketData.location === 'remote' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>🌐 Remote</button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Issue Description <span className="text-blue-400">*</span></label>
                  <textarea value={newTicketData.issue} onChange={(e) => setNewTicketData({ ...newTicketData, issue: e.target.value })} rows={4} required className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white resize-none" placeholder="Describe the issue..." />
                </div>

                <div className="flex gap-3">
                  <button type="submit" disabled={!selectedUserId || !newTicketData.issue.trim() || !newTicketData.client.trim() || !newTicketData.ticketType || !newTicketData.estateOrBuilding.trim() || !newTicketData.cmlLocation.trim()} className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium disabled:opacity-50">Create Ticket</button>
                  <button type="button" onClick={() => setShowCreateForm(false)} className="px-5 py-3 rounded-xl bg-slate-700 text-slate-300">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Image Links Modal */}
      {showImageLinks && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowImageLinks(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="w-full max-w-4xl bg-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-700/50 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">All Image Links</h2>
                  <button onClick={() => setShowImageLinks(false)} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {(() => {
                  // Collect all image links
                  const imageLinks: Array<{
                    type: 'profile' | 'ticket-attachment' | 'ticket-site-file' | 'travel-log';
                    url: string;
                    name: string;
                    context: string;
                  }> = [];

                  // Profile avatars
                  profiles.forEach(profile => {
                    if (profile.avatar_url) {
                      imageLinks.push({
                        type: 'profile',
                        url: profile.avatar_url,
                        name: `${profile.full_name} - Profile Picture`,
                        context: `Profile: ${profile.full_name}`
                      });
                    }
                  });

                  // Ticket attachments and site files
                  tickets.forEach(ticket => {
                    const memberProfile = profiles.find(p => p.id === ticket.user_id);
                    const ticketContext = `${ticket.ticket_number} - ${memberProfile?.full_name || 'Unknown'}`;

                    // Regular attachments
                    if (ticket.attachments && ticket.attachments.length > 0) {
                      ticket.attachments.forEach((att: { url: string; name: string; type: string }) => {
                        if (att.type?.startsWith('image/')) {
                          imageLinks.push({
                            type: 'ticket-attachment',
                            url: att.url,
                            name: att.name,
                            context: `Ticket: ${ticketContext}`
                          });
                        }
                      });
                    }

                    // Site files
                    if (ticket.site_files && ticket.site_files.length > 0) {
                      ticket.site_files.forEach((file: { url: string; name: string; type: string; label?: string }) => {
                        if (file.type?.startsWith('image/')) {
                          imageLinks.push({
                            type: 'ticket-site-file',
                            url: file.url,
                            name: file.label || file.name,
                            context: `Ticket: ${ticketContext}`
                          });
                        }
                      });
                    }

                    // Update attachments
                    if (ticket.updates && ticket.updates.length > 0) {
                      ticket.updates.forEach((update: { attachments?: { url: string; name: string; type: string }[] }) => {
                        if (update.attachments && update.attachments.length > 0) {
                          update.attachments.forEach((att: { url: string; name: string; type: string }) => {
                            if (att.type?.startsWith('image/')) {
                              imageLinks.push({
                                type: 'ticket-attachment',
                                url: att.url,
                                name: att.name,
                                context: `Ticket Update: ${ticketContext}`
                              });
                            }
                          });
                        }
                      });
                    }
                  });

                  // Travel log attachments
                  travelLogs.forEach(log => {
                    const memberProfile = profiles.find(p => p.id === log.user_id);
                    const logContext = `${memberProfile?.full_name || 'Unknown'} - ${log.reason}`;

                    if (log.attachments && log.attachments.length > 0) {
                      log.attachments.forEach((att: { url: string; name: string; type: string }) => {
                        if (att.type?.startsWith('image/')) {
                          imageLinks.push({
                            type: 'travel-log',
                            url: att.url,
                            name: att.name,
                            context: `Travel Log: ${logContext}`
                          });
                        }
                      });
                    }
                  });

                  if (imageLinks.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <p className="text-slate-500">No images found.</p>
                      </div>
                    );
                  }

                  // Group by type
                  const grouped = {
                    profile: imageLinks.filter(l => l.type === 'profile'),
                    'ticket-attachment': imageLinks.filter(l => l.type === 'ticket-attachment'),
                    'ticket-site-file': imageLinks.filter(l => l.type === 'ticket-site-file'),
                    'travel-log': imageLinks.filter(l => l.type === 'travel-log')
                  };

                  return (
                    <div className="space-y-6">
                      {/* Profile Pictures */}
                      {grouped.profile.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-3">Profile Pictures ({grouped.profile.length})</h3>
                          <div className="space-y-2">
                            {grouped.profile.map((link, idx) => (
                              <div key={idx} className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-slate-300 truncate">{link.name}</p>
                                  <p className="text-xs text-slate-500 truncate">{link.context}</p>
                                </div>
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-4 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 text-sm font-medium flex items-center gap-2 flex-shrink-0"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                  View
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Ticket Attachments */}
                      {grouped['ticket-attachment'].length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-3">Ticket Attachments ({grouped['ticket-attachment'].length})</h3>
                          <div className="space-y-2">
                            {grouped['ticket-attachment'].map((link, idx) => (
                              <div key={idx} className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-slate-300 truncate">{link.name}</p>
                                  <p className="text-xs text-slate-500 truncate">{link.context}</p>
                                </div>
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-4 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 text-sm font-medium flex items-center gap-2 flex-shrink-0"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                  View
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Ticket Site Files */}
                      {grouped['ticket-site-file'].length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-3">Ticket Site Files ({grouped['ticket-site-file'].length})</h3>
                          <div className="space-y-2">
                            {grouped['ticket-site-file'].map((link, idx) => (
                              <div key={idx} className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-slate-300 truncate">{link.name}</p>
                                  <p className="text-xs text-slate-500 truncate">{link.context}</p>
                                </div>
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-4 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 text-sm font-medium flex items-center gap-2 flex-shrink-0"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                  View
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Travel Log Attachments */}
                      {grouped['travel-log'].length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-3">Travel Log Attachments ({grouped['travel-log'].length})</h3>
                          <div className="space-y-2">
                            {grouped['travel-log'].map((link, idx) => (
                              <div key={idx} className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-slate-300 truncate">{link.name}</p>
                                  <p className="text-xs text-slate-500 truncate">{link.context}</p>
                                </div>
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-4 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 text-sm font-medium flex items-center gap-2 flex-shrink-0"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                  View
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Summary */}
                      <div className="mt-6 p-4 rounded-xl bg-slate-800/30 border border-slate-700/30">
                        <p className="text-sm text-slate-400">
                          <span className="font-semibold text-white">Total Images:</span> {imageLinks.length}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Picture Upload Modal */}
      {uploadingFor && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !uploading && setUploadingFor(null)} />
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl">
              <div className="p-6 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Upload Profile Picture</h2>
                  <button 
                    onClick={() => !uploading && setUploadingFor(null)} 
                    disabled={uploading}
                    className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="flex flex-col items-center gap-4">
                  {/* Current Avatar */}
                  <div className="flex items-center gap-4 w-full p-4 rounded-xl bg-slate-800/50">
                    {uploadingFor.avatar_url ? (
                      <Image 
                        src={`${uploadingFor.avatar_url}${uploadingFor.avatar_url.includes('?') ? '&' : '?'}t=${Date.now()}`} 
                        alt={uploadingFor.full_name} 
                        width={64} 
                        height={64} 
                        className="w-16 h-16 rounded-xl object-cover" 
                        unoptimized
                      />
                    ) : (
                      <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${getAvatarGradient(uploadingFor.full_name)} flex items-center justify-center text-white font-bold text-xl`}>
                        {uploadingFor.avatar}
                      </div>
                    )}
                    <div>
                      <p className="text-lg font-medium text-white">{uploadingFor.full_name}</p>
                      <p className="text-sm text-slate-400">{uploadingFor.role}</p>
                    </div>
                  </div>

                  {/* Upload Area */}
                  <label className={`w-full p-8 rounded-xl border-2 border-dashed flex flex-col items-center gap-3 cursor-pointer transition-colors ${uploading ? 'border-slate-600 bg-slate-800/30' : 'border-slate-600 hover:border-cyan-500 hover:bg-cyan-500/5'}`}>
                    {uploading ? (
                      <>
                        <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-slate-400">Uploading...</p>
                      </>
                    ) : (
                      <>
                        <svg className="w-10 h-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div className="text-center">
                          <p className="text-sm text-white">Click to upload an image</p>
                          <p className="text-xs text-slate-500 mt-1">PNG, JPG, GIF up to 5MB</p>
                        </div>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleProfilePictureUpload} 
                      disabled={uploading}
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Management Modal */}
      {showUserManagement && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowUserManagement(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="w-full max-w-2xl bg-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-700/50 sticky top-0 bg-slate-900">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Manage Users</h2>
                  <button onClick={() => setShowUserManagement(false)} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Password Management Info */}
                <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <h3 className="text-sm font-semibold text-amber-400 mb-2">🔐 Password Management</h3>
                  <p className="text-xs text-slate-300 mb-3">
                    To reset a team member&apos;s password, go to your Supabase Dashboard:
                  </p>
                  <a 
                    href="https://supabase.com/dashboard/project/csbliwkldlglbniqmdin/auth/users" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 text-sm hover:bg-amber-500/30 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open Supabase Auth Dashboard
                  </a>
                </div>

                {/* Team Members List */}
                <h3 className="text-sm font-semibold text-slate-300 mb-4">Team Members ({profiles.length})</h3>
                <div className="space-y-3">
                  {profiles.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                      <div className="flex items-center gap-3">
                        {p.avatar_url ? (
                          <Image src={p.avatar_url} alt={p.full_name} width={40} height={40} className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getAvatarGradient(p.full_name)} flex items-center justify-center text-white font-bold text-sm`}>
                            {p.avatar}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-white">{p.full_name}</p>
                          <p className="text-xs text-slate-500">{p.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded text-xs bg-slate-700 text-slate-300">{p.role}</span>
                        {p.is_admin && (
                          <span className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400">Admin</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add New User Info */}
                <div className="mt-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <h3 className="text-sm font-semibold text-slate-300 mb-2">➕ Add New Team Member</h3>
                  <p className="text-xs text-slate-400 mb-3">
                    New team members can sign up at:
                  </p>
                  <code className="block p-2 rounded bg-slate-900 text-cyan-400 text-xs break-all">
                    https://kpi-tracker-six.vercel.app/login
                  </code>
                  <p className="text-xs text-slate-500 mt-2">
                    They click &quot;Sign up&quot; and create their account. Then you can update their role in Supabase if needed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
