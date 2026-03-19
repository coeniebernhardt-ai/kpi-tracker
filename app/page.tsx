'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './context/AuthContext';
import Logo from './components/Logo';

export default function Home() {
  const router = useRouter();
  const { user, loading, isAdmin } = useAuth();

  useEffect(() => {
    const target = loading ? 'wait' : !user ? 'login' : isAdmin ? 'admin' : 'dashboard';
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9f9d758f-7a49-4eb9-9ee6-1128596866c4', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'app/page.tsx:Home',
        message: 'redirect effect',
        data: { loading, hasUser: !!user, isAdmin, target },
        timestamp: Date.now(),
        hypothesisId: 'H2',
      }),
    }).catch(() => {});
    // #endregion
    if (!loading) {
      if (!user) {
        // Not logged in → go to login
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9f9d758f-7a49-4eb9-9ee6-1128596866c4', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'app/page.tsx:pushLogin',
            message: 'router.push /login',
            data: {},
            timestamp: Date.now(),
            hypothesisId: 'H3',
          }),
        }).catch(() => {});
        // #endregion
        router.replace('/login');
      } else if (isAdmin) {
        // Admin → go to admin dashboard
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9f9d758f-7a49-4eb9-9ee6-1128596866c4', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'app/page.tsx:pushAdmin',
            message: 'router.push /admin',
            data: {},
            timestamp: Date.now(),
            hypothesisId: 'H3',
          }),
        }).catch(() => {});
        // #endregion
        router.replace('/admin');
      } else {
        // Regular user → go to their tickets
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9f9d758f-7a49-4eb9-9ee6-1128596866c4', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'app/page.tsx:pushDashboard',
            message: 'router.push /dashboard',
            data: {},
            timestamp: Date.now(),
            hypothesisId: 'H3',
          }),
        }).catch(() => {});
        // #endregion
        router.replace('/dashboard');
      }
    }
  }, [user, loading, isAdmin, router]);

  // Show loading while checking auth and redirecting
  return (
    <div className="min-h-screen bg-slate-950 bg-grid-pattern bg-radial-gradient flex items-center justify-center">
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <Logo variant="login" />
        </div>
            <h1 className="text-2xl font-bold text-white mb-2">Think-Q</h1>
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mt-4" />
        <p className="text-slate-400 mt-4">Redirecting...</p>
      </div>
    </div>
  );
}
