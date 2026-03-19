'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';

type Tab = 'create' | 'sent';

export default function NotificationCentrePage() {
  const router = useRouter();
  const { user, loading, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('create');

  // ✅ FIXED AUTH LOGIC (no flicker)
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

  // ✅ PREVENT RENDER UNTIL READY
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/admin" className="text-slate-400 hover:text-white">
            ←
          </Link>
          <h1 className="text-lg font-semibold">Notification Centre</h1>
        </div>
      </header>

      {/* CONTENT */}
      <main className="max-w-5xl mx-auto px-4 py-6">

        {/* TABS */}
        <div className="mb-6 flex gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-lg text-sm ${
              activeTab === 'create'
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            Create
          </button>

          <button
            onClick={() => setActiveTab('sent')}
            className={`px-4 py-2 rounded-lg text-sm ${
              activeTab === 'sent'
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            Sent
          </button>
        </div>

        {/* CREATE TAB */}
        {activeTab === 'create' && (
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 space-y-4">

            <input
              placeholder="Title (optional)"
              className="w-full p-3 bg-slate-800 rounded"
            />

            <textarea
              placeholder="Notification message..."
              rows={3}
              className="w-full p-3 bg-slate-800 rounded"
            />

            <button className="w-full py-3 bg-amber-500 rounded font-medium">
              Preview & Confirm
            </button>

          </div>
        )}

        {/* SENT TAB */}
        {activeTab === 'sent' && (
          <div className="space-y-3">

            <div className="flex gap-4">
              <input type="date" className="bg-slate-800 p-2 rounded" />
              <input type="date" className="bg-slate-800 p-2 rounded" />
            </div>

            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
              <p className="text-slate-400 text-sm">
                Sent notifications will appear here (expandable view coming next).
              </p>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}