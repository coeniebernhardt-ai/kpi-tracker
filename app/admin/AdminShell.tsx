'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

type NavItem = {
  key: 'dashboard' | 'tickets' | 'team' | 'data-metrics' | 'images' | 'reports' | 'manage-users';
  label: string;
  href: string;
};

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/admin' },
  { key: 'tickets', label: 'Tickets', href: '/admin/tickets' },
  { key: 'team', label: 'Team', href: '/admin/team' },
  { key: 'data-metrics', label: 'Data Metrics', href: '/admin/data-metrics' },
  { key: 'images', label: 'Images', href: '/admin/images' },
  { key: 'reports', label: 'Reports', href: '/admin/reports' },
  { key: 'manage-users', label: 'Manage Users', href: '/admin/manage-users' },
];

function getActiveKey(pathname: string): NavItem['key'] {
  if (pathname === '/admin/tickets') return 'tickets';
  if (pathname === '/admin/team') return 'team';
  if (pathname === '/admin/data-metrics') return 'data-metrics';
  if (pathname === '/admin/images') return 'images';
  if (pathname === '/admin/reports') return 'reports';
  if (pathname === '/admin/manage-users') return 'manage-users';
  return 'dashboard';
}

export default function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading, isAdmin } = useAuth();

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

  const activeKey = useMemo(() => getActiveKey(pathname), [pathname]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">
        Loading admin workspace...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 bg-grid-pattern bg-radial-gradient text-white">
      <aside className="hidden md:block fixed left-0 top-0 h-screen w-60 border-r border-slate-800 bg-slate-900/95 z-30">
        <div className="flex h-full flex-col p-4">
          <div className="mb-4 px-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Admin</p>
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = activeKey === item.key;

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`flex w-full items-center rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-blue-500/30 bg-blue-500/20 text-blue-300'
                      : 'border-transparent text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="md:pl-60">
        <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
          <div className="mx-auto max-w-7xl px-6 py-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
              <div className="hidden md:block" />

              <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-white">
                    {profile?.avatar || 'A'}
                  </div>
                )}

                <div className="text-center md:text-left">
                  <p className="text-sm font-semibold text-white">{profile?.full_name || 'Admin'}</p>
                  <p className="text-xs text-slate-400">{profile?.role || 'Administrator'} • Admin</p>
                </div>
              </div>

              <div className="flex justify-center md:justify-end">
                <Link
                  href="/admin?createTicket=1"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 font-medium text-white shadow-lg transition-all hover:shadow-blue-500/25"
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

        <div className="border-b border-slate-800/80 bg-slate-950/80 px-4 py-3 md:hidden">
          <nav className="flex gap-2 overflow-x-auto pb-1">
            {navItems.map((item) => {
              const isActive = activeKey === item.key;

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-blue-500/30 bg-blue-500/20 text-blue-300'
                      : 'border-slate-800 bg-slate-900/70 text-slate-300'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {children}
      </div>
    </div>
  );
}
