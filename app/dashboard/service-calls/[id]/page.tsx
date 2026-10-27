'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import ServiceCallDetail from '@/app/components/service-calls/ServiceCallDetail';

/** Member / technician detail — stays on dashboard routes (no admin redirect). */
export default function MemberServiceCallDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = String(params.id || '');

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user || !id) {
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
          <Link href="/dashboard/service-calls" className="text-sm text-cyan-400 hover:underline">
            ← Service Calls
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <ServiceCallDetail id={id} basePath="/dashboard/service-calls" ticketsHref="/dashboard" />
      </main>
    </div>
  );
}
