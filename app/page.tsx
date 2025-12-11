'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './context/AuthContext';
import Logo from './components/Logo';

export default function Home() {
  const router = useRouter();
  const { user, loading, isAdmin } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Not logged in → go to login
        router.push('/login');
      } else if (isAdmin) {
        // Admin → go to admin dashboard
        router.push('/admin');
      } else {
        // Regular user → go to their tickets
        router.push('/dashboard');
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
