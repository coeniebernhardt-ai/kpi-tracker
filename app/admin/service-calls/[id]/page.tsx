'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import ServiceCallDetail from '@/app/components/service-calls/ServiceCallDetail';

export default function AdminServiceCallDetailPage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = String(params.id || '');

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (!isAdmin) router.replace('/dashboard');
  }, [user, loading, isAdmin, router]);

  if (loading || !isAdmin || !id) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  return <ServiceCallDetail id={id} basePath="/admin/service-calls" ticketsHref="/admin/tickets" />;
}
