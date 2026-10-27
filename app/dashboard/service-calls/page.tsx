'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import ServiceCallsApp from '@/app/components/service-calls/ServiceCallsApp';
import Link from 'next/link';

/** Member / technician Service Calls — stays on dashboard routes (no admin redirect). */
export default function MemberServiceCallsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 bg-grid-pattern bg-radial-gradient">
      <header className="border-b border-slate-800 bg-slate-950/80 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/dashboard" className="text-sm text-cyan-400 hover:underline">
            ← Dashboard
          </Link>
          <span className="text-sm text-slate-400">Service Calls</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <ServiceCallsApp basePath="/dashboard/service-calls" variant="member" />
      </main>
    </div>
  );
}
