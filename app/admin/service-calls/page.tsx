'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import ServiceCallsApp from '@/app/components/service-calls/ServiceCallsApp';

export default function AdminServiceCallsPage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (!isAdmin) router.replace('/dashboard');
  }, [user, loading, isAdmin, router]);

  if (loading || !isAdmin) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  return <ServiceCallsApp basePath="/admin/service-calls" variant="admin" />;
}
