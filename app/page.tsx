'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from './context/AuthContext';
import { getAllProfiles, Profile } from './lib/supabase';

export default function Home() {
  const router = useRouter();
  const { user, profile, loading, isAdmin, signOut } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Load profiles based on user role
  useEffect(() => {
    const loadProfiles = async () => {
      if (!user || !profile) return;
      
      setLoadingProfiles(true);
      
      if (isAdmin) {
        // Admin sees all profiles
        const allProfiles = await getAllProfiles();
        setProfiles(allProfiles);
      } else {
        // Regular user sees only their own profile
        setProfiles([profile]);
      }
      
      setLoadingProfiles(false);
    };

    if (user && profile) {
      loadProfiles();
    }
  }, [user, profile, isAdmin]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 bg-grid-pattern bg-radial-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything while redirecting
  if (!user) {
    return null;
  }

  const getAvatarGradient = (name: string) => {
    const colors = [
      'from-cyan-500 to-blue-600',
      'from-violet-500 to-purple-600',
      'from-emerald-500 to-teal-600',
      'from-amber-500 to-orange-600',
      'from-rose-500 to-pink-600',
      'from-indigo-500 to-blue-600',
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-grid-pattern bg-radial-gradient">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Logo */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">KPI Tracker</h1>
                <p className="text-xs text-slate-400">Digital Solutions Team</p>
              </div>
            </div>
            
            {/* User info & actions */}
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-slate-500">Logged in as</p>
                  <p className="text-sm font-medium text-white">{profile?.full_name}</p>
                </div>
                {isAdmin && (
                  <span className="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-400 text-xs font-medium">
                    Admin
                  </span>
                )}
              </div>
              
              <div className="w-px h-8 bg-slate-700 hidden md:block" />
              
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-medium shadow-lg hover:shadow-cyan-500/25 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                  My Tickets
                </Link>
                
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-orange-600 text-white text-sm font-medium shadow-lg hover:shadow-rose-500/25 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Admin
                  </Link>
                )}
                
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page title */}
        <div className="mb-8 animate-fade-in">
          <h2 className="text-3xl font-bold text-white mb-2">
            {isAdmin ? 'Team Performance Dashboard' : 'My Dashboard'}
          </h2>
          <p className="text-slate-400">
            {isAdmin 
              ? 'Monitor KPIs for all team members. Click on a team member to view detailed metrics.'
              : 'View your performance metrics and KPIs.'}
          </p>
        </div>

        {/* Quick Stats for Admin */}
        {isAdmin && (
          <section className="mb-10 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                <p className="text-xs text-slate-500 mb-1">Team Members</p>
                <p className="text-2xl font-bold text-white">{profiles.filter(p => !p.is_admin).length}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                <p className="text-xs text-slate-500 mb-1">Active Users</p>
                <p className="text-2xl font-bold text-emerald-400">{profiles.filter(p => p.is_active).length}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                <p className="text-xs text-slate-500 mb-1">Admins</p>
                <p className="text-2xl font-bold text-rose-400">{profiles.filter(p => p.is_admin).length}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                <p className="text-xs text-slate-500 mb-1">Overall Status</p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-lg font-medium text-emerald-400">On Track</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Team members / User profile */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-300 flex items-center gap-2">
              <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {isAdmin ? 'Team Members' : 'My Profile'}
            </h3>
          </div>
          
          {loadingProfiles ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-500">Loading profiles...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {profiles.map((member, index) => (
                <div
                  key={member.id}
                  onClick={() => setSelectedMember(member)}
                  className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-cyan-500/50 cursor-pointer transition-all hover:-translate-y-1 animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getAvatarGradient(member.full_name)} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                      {member.avatar_url ? (
                        <img 
                          src={member.avatar_url} 
                          alt={member.full_name}
                          className="w-14 h-14 rounded-xl object-cover"
                        />
                      ) : (
                        getInitials(member.full_name)
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-white">{member.full_name}</h4>
                        {member.is_admin && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-xs">Admin</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400">{member.role}</p>
                      <p className="text-xs text-slate-500 mt-1">{member.email}</p>
                    </div>
                    
                    {/* Status indicator */}
                    <div className={`w-2 h-2 rounded-full ${member.is_active ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* KPI Legend */}
        <section className="mt-10 p-6 rounded-2xl bg-slate-800/30 border border-slate-700/30 animate-fade-in" style={{ animationDelay: '600ms' }}>
          <h3 className="text-sm font-semibold text-slate-300 mb-4">KPI Categories</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 mt-1" />
              <div>
                <p className="text-sm font-medium text-slate-200">Individual KPIs</p>
                <p className="text-xs text-slate-500">Personal performance metrics tracked per team member</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 mt-1" />
              <div>
                <p className="text-sm font-medium text-slate-200">Team KPIs</p>
                <p className="text-xs text-slate-500">Collaborative metrics shared across the support team</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 mt-1" />
              <div>
                <p className="text-sm font-medium text-slate-200">Group Impact & Engagement</p>
                <p className="text-xs text-slate-500">Workplace behavior assessed via Bamboo surveys</p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer note */}
        <footer className="mt-10 text-center text-xs text-slate-600 animate-fade-in" style={{ animationDelay: '700ms' }}>
          <p>KPI achievement is at the discretion of the Solutions Manager, Coenie Bernhardt, in conjunction with the Executive Management Team.</p>
          <p className="mt-1">Tracking systems: Google Sheets Ticket Management System • ClickUp • Bamboo HR</p>
        </footer>
      </main>

      {/* Member detail modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedMember(null)}>
          <div 
            className="w-full max-w-md p-6 rounded-2xl bg-slate-800 border border-slate-700 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 mb-6">
              <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${getAvatarGradient(selectedMember.full_name)} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                {selectedMember.avatar_url ? (
                  <img 
                    src={selectedMember.avatar_url} 
                    alt={selectedMember.full_name}
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                ) : (
                  getInitials(selectedMember.full_name)
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white">{selectedMember.full_name}</h3>
                <p className="text-slate-400">{selectedMember.role}</p>
                <p className="text-sm text-slate-500">{selectedMember.email}</p>
              </div>
              <button 
                onClick={() => setSelectedMember(null)}
                className="text-slate-500 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {selectedMember.definition && (
              <div className="mb-4 p-3 rounded-xl bg-slate-900/50">
                <p className="text-xs text-slate-500 mb-1">Role Definition</p>
                <p className="text-sm text-slate-300">{selectedMember.definition}</p>
              </div>
            )}

            {selectedMember.responsibilities && selectedMember.responsibilities.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-slate-500 mb-2">Responsibilities</p>
                <ul className="space-y-1">
                  {selectedMember.responsibilities.map((resp, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="text-cyan-400 mt-1">•</span>
                      {resp}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-700">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${selectedMember.is_active ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                <span className="text-xs text-slate-400">{selectedMember.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              {selectedMember.is_admin && (
                <span className="px-2 py-1 rounded bg-rose-500/20 text-rose-400 text-xs">Admin</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
