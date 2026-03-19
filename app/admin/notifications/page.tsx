'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { supabase, getAllProfiles } from '../../lib/supabase';
import type { Profile } from '../../lib/supabase';

type NotificationCentreTab = 'create' | 'sent';

const MAX_TOTAL_ATTACHMENTS_BYTES = 4 * 1024 * 1024;

export default function NotificationCentrePage() {
  const router = useRouter();
  const { user, loading, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<NotificationCentreTab>('create');

  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationAttachmentFiles, setNotificationAttachmentFiles] = useState<File[]>([]);
  const [notificationUploadProgress, setNotificationUploadProgress] = useState<'idle' | number>('idle');
  const [notificationRecipientMode, setNotificationRecipientMode] = useState<'all' | 'selected'>('all');
  const [notificationSelectedIds, setNotificationSelectedIds] = useState<Set<string>>(new Set());
  const [notificationConfirmSend, setNotificationConfirmSend] = useState(false);
  const [notificationSending, setNotificationSending] = useState(false);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [broadcastGroups, setBroadcastGroups] = useState<any[]>([]);
  const [broadcastHistoryLoading, setBroadcastHistoryLoading] = useState(false);
  const [selectedBroadcastId, setSelectedBroadcastId] = useState<string | null>(null);
  const [broadcastDetail, setBroadcastDetail] = useState<any>(null);
  const [broadcastDetailLoading, setBroadcastDetailLoading] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push('/dashboard');
    }
  }, [user, loading, isAdmin, router]);

  useEffect(() => {
    getAllProfiles().then(setProfiles);
  }, []);

  useEffect(() => {
    if (!user?.id || !isAdmin) return;
    setBroadcastHistoryLoading(true);

    supabase.auth.getSession().then(({ data: { session } }) => {
      const headers: HeadersInit = {};
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      return fetch('/api/admin/notifications/broadcasts', { headers });
    })
      .then((r) => r.ok ? r.json() : [])
      .then(setBroadcastGroups)
      .finally(() => setBroadcastHistoryLoading(false));
  }, [user?.id, isAdmin]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* 🚨 BUILD TEST BANNER */}
      <div style={{
        background: 'red',
        color: 'white',
        textAlign: 'center',
        padding: '10px',
        fontWeight: 'bold'
      }}>
        🚨 NEW BUILD CONFIRMED 🚨
      </div>

      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
              ←
            </Link>
            <h1 className="text-lg font-semibold text-white">Notification Centre</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded ${activeTab === 'create' ? 'bg-blue-500 text-white' : 'bg-slate-700'}`}
          >
            Create
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-4 py-2 rounded ${activeTab === 'sent' ? 'bg-blue-500 text-white' : 'bg-slate-700'}`}
          >
            Sent
          </button>
        </div>

        {/* CREATE TAB */}
        {activeTab === 'create' && (
          <div className="space-y-4">

            <input
              value={notificationTitle}
              onChange={(e) => setNotificationTitle(e.target.value)}
              placeholder="Title"
              className="w-full p-3 bg-slate-800 rounded"
            />

            <textarea
              value={notificationMessage}
              onChange={(e) => setNotificationMessage(e.target.value)}
              placeholder="Message"
              className="w-full p-3 bg-slate-800 rounded"
            />

            <button
              onClick={() => alert('Send logic here')}
              className="px-4 py-2 bg-amber-500 rounded text-white"
            >
              Send Notification
            </button>

          </div>
        )}

        {/* SENT TAB */}
        {activeTab === 'sent' && (
          <div>
            {broadcastHistoryLoading ? (
              <p>Loading…</p>
            ) : (
              <div className="space-y-2">
                {broadcastGroups.map((g) => (
                  <div key={g.broadcastGroupId} className="p-4 bg-slate-800 rounded">
                    <p className="text-white">{g.title || 'No title'}</p>
                    <p className="text-slate-400 text-sm">{g.messagePreview}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}