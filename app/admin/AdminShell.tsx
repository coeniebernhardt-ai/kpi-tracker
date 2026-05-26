'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Menu } from 'lucide-react';
import Logo from '../components/Logo';
import SignOutConfirmModal from '../components/SignOutConfirmModal';
import { useAuth } from '../context/AuthContext';
import { ADMIN_NAV_ITEMS, getAdminActiveKey } from './admin-ui';

const AIInsightsPanel = dynamic(() => import('../components/AIInsightsPanel'), {
  ssr: false,
  loading: () => (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/70 px-4 py-10 text-center text-slate-400">
      Loading Think-Q...
    </div>
  ),
});

export default function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, profile, session, loading, isAdmin, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showThinkQ, setShowThinkQ] = useState(false);
  const [pendingTotalCount, setPendingTotalCount] = useState(0);

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
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!user?.id || !isAdmin) return;

    const fetchPendingCount = async () => {
      try {
        const response = await fetch('/api/pending-tickets', {
          credentials: 'include',
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        });
        if (!response.ok) return;
        const data = await response.json();
        setPendingTotalCount(typeof data.totalCount === 'number' ? data.totalCount : 0);
      } catch {
        // Ignore badge fetch errors; the tickets page still works.
      }
    };

    void fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, [isAdmin, session?.access_token, user?.id]);

  const activeKey = useMemo(() => getAdminActiveKey(pathname), [pathname]);
  const sidebarItems = useMemo(
    () => ADMIN_NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin),
    [isAdmin],
  );
  const thinkQFilters = useMemo(
    () => ({
      startDate: searchParams.get('startDate') ?? undefined,
      endDate: searchParams.get('endDate') ?? undefined,
      metric: searchParams.get('metric') ?? undefined,
    }),
    [searchParams]
  );

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.push('/login');
    } finally {
      setSigningOut(false);
      setShowSignOutConfirm(false);
    }
  };

  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">
        Loading admin workspace...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 bg-grid-pattern bg-radial-gradient text-white">
      <div
        className={`fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm transition md:hidden ${
          sidebarOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-slate-800 bg-slate-950/95 transition-transform duration-200 md:w-20 lg:w-72 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-5 lg:px-5">
          <div className="overflow-hidden">
            <div className="hidden lg:block">
              <Logo variant="team" width={190} height={48} className="h-12 w-auto" />
            </div>
            <div className="md:block lg:hidden">
              <Logo variant="team" width={36} height={36} className="h-9 w-auto" />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
          {sidebarItems.map((item) => {
            const isActive = activeKey === item.key;

            if (item.action === 'sign-out') {
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setShowSignOutConfirm(true)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-medium transition lg:justify-start md:justify-center ${
                    isActive
                      ? 'border-blue-500/30 bg-blue-500/15 text-blue-300'
                      : 'border-transparent text-slate-400 hover:border-slate-800 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <span className="text-xl leading-none">{item.emoji}</span>
                  <span className="lg:block md:hidden">Sign Out</span>
                </button>
              );
            }

            return (
              <Link
                key={item.key}
                href={item.href ?? '/admin'}
                className={`relative flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-medium transition lg:justify-start md:justify-center ${
                  isActive
                    ? 'border-blue-500/30 bg-blue-500/15 text-blue-300 shadow-lg shadow-blue-950/30'
                    : 'border-transparent text-slate-400 hover:border-slate-800 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <span className="text-xl leading-none">{item.emoji}</span>
                <span className="lg:block md:hidden">{item.label}</span>
                {item.key === 'tickets' && pendingTotalCount > 0 && (
                  <span className="absolute right-3 top-2 inline-flex min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[11px] font-semibold text-white md:right-1.5 md:top-1.5 lg:right-3 lg:top-2">
                    {pendingTotalCount > 99 ? '99+' : pendingTotalCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 px-3 py-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-4 text-center md:px-2 lg:px-3">
            <p className="hidden text-xs uppercase tracking-[0.22em] text-slate-500 lg:block">Think-Q</p>
            <p className="mt-1 hidden text-sm text-slate-400 lg:block">Your Workplace,</p>
            <p className="hidden bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-base font-semibold text-transparent lg:block">
              Simplified
            </p>
          </div>
        </div>
      </aside>

      <div className="md:pl-20 lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
          <div className="mx-auto max-w-7xl px-6 py-4">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
              <div className="flex items-center gap-3 lg:justify-start">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="rounded-2xl border border-slate-800 bg-slate-900/80 p-2.5 text-slate-300 transition hover:border-slate-700 hover:text-white md:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </div>

              <div className="flex min-w-0 items-center justify-center gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 px-5 py-3">
                <button
                  type="button"
                  onClick={() => setShowThinkQ(true)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-cyan-500/20 bg-slate-950/90 px-4 py-3 text-sm font-medium text-cyan-200 transition hover:border-cyan-400/40 hover:text-white"
                >
                  <Logo variant="team" width={72} height={18} className="h-[18px] w-auto" />
                  <span>Ask</span>
                </button>
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    width={84}
                    height={84}
                    className="h-20 w-20 rounded-3xl object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-500 text-2xl font-bold text-white">
                    {profile?.avatar || 'A'}
                  </div>
                )}

                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-white">{profile?.full_name || 'Admin'}</p>
                  <p className="truncate text-sm text-slate-400">{profile?.role || 'Administrator'} • Admin</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:text-white"
                >
                  Team Member View
                </Link>
                <Link
                  href="/admin?createTicket=1"
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-blue-950/30 transition hover:opacity-90"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Ticket
                </Link>
              </div>
            </div>
          </div>
        </header>

        {children}
      </div>

      <SignOutConfirmModal
        open={showSignOutConfirm}
        onCancel={() => setShowSignOutConfirm(false)}
        onConfirm={() => void handleSignOut()}
        busy={signingOut}
      />

      {showThinkQ && (
        <div className="fixed inset-0 z-[80] overflow-hidden">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowThinkQ(false)} />
          <div className="absolute inset-0 flex items-start justify-center p-4 pt-24 md:p-6 md:pt-28">
            <div className="w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/95 p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-white">Ask Think-Q</p>
                  <p className="mt-1 text-sm text-slate-400">Use the assistant from the top toolbar while keeping the dashboard metrics-only.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowThinkQ(false)}
                  className="rounded-2xl bg-slate-800 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-700 hover:text-white"
                >
                  Close
                </button>
              </div>

              <AIInsightsPanel filters={thinkQFilters} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
