'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { supabase, getAllProfiles } from '../../lib/supabase';
import type { Profile } from '../../lib/supabase';

type NotificationCentreTab = 'create' | 'sent';

// Vercel serverless request body limit ~4.5 MB; keep total attachments under 4 MB to avoid 413
const MAX_TOTAL_ATTACHMENTS_BYTES = 4 * 1024 * 1024;

export default function NotificationCentrePage() {
  const router = useRouter();
  const { user, loading, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<NotificationCentreTab>('create');

  // Create Notification tab state
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationAttachmentFiles, setNotificationAttachmentFiles] = useState<File[]>([]);
  const [notificationUploadProgress, setNotificationUploadProgress] = useState<'idle' | number>('idle');
  const [notificationRecipientMode, setNotificationRecipientMode] = useState<'all' | 'selected'>('all');
  const [notificationSelectedIds, setNotificationSelectedIds] = useState<Set<string>>(new Set());
  const [notificationConfirmSend, setNotificationConfirmSend] = useState(false);
  const [notificationSending, setNotificationSending] = useState(false);

  // Sent Notifications tab state (reuse Notification History)
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [broadcastGroups, setBroadcastGroups] = useState<Array<{ broadcastGroupId: string; title: string | null; messagePreview: string; hasImage: boolean; createdAt: string; totalRecipients: number; totalRead: number; readPercentage: number; totalUnread: number }>>([]);
  const [broadcastHistoryLoading, setBroadcastHistoryLoading] = useState(false);
  const [selectedBroadcastId, setSelectedBroadcastId] = useState<string | null>(null);
  const [broadcastDetail, setBroadcastDetail] = useState<{ broadcastGroupId: string; title: string | null; message: string; imageUrl: string | null; createdAt: string; totalRecipients: number; totalRead: number; totalUnread: number; readPercentage: number; recipients: Array<{ recipientId: string; name: string; email: string; role: string; read: boolean; readAt: string | null }>; reactionsSummary?: { LIKE: number; MUSCLE: number; LAUGH: number; COPY_THAT: number }; reactionsByUser?: Array<{ userName: string; reactionType: string }>; attachments?: Array<{ id: string; fileName: string; fileType: string; fileSize: number }> } | null>(null);
  const [broadcastDetailLoading, setBroadcastDetailLoading] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push('/dashboard');
    }
  }, [user, loading, isAdmin, router]);

  useEffect(() => {
    let cancelled = false;
    getAllProfiles().then((data) => {
      if (!cancelled) setProfiles(data);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!user?.id || !isAdmin) return;
    setBroadcastHistoryLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      const headers: HeadersInit = {};
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      return fetch('/api/admin/notifications/broadcasts', { credentials: 'include', headers });
    })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setBroadcastGroups(Array.isArray(data) ? data : []))
      .catch(() => setBroadcastGroups([]))
      .finally(() => setBroadcastHistoryLoading(false));
  }, [user?.id, isAdmin]);

  const fetchBroadcastDetail = useCallback((broadcastId: string) => {
    return supabase.auth.getSession().then(({ data: { session } }) => {
      const headers: HeadersInit = {};
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      return fetch(`/api/admin/notifications/broadcasts/${encodeURIComponent(broadcastId)}`, { credentials: 'include', headers });
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => setBroadcastDetail(data));
  }, []);

  useEffect(() => {
    if (!selectedBroadcastId || !user?.id) {
      setBroadcastDetail(null);
      return;
    }
    setBroadcastDetailLoading(true);
    setBroadcastDetail(null);
    fetchBroadcastDetail(selectedBroadcastId).finally(() => setBroadcastDetailLoading(false));
  }, [selectedBroadcastId, user?.id, fetchBroadcastDetail]);

  useEffect(() => {
    if (!selectedBroadcastId || !user?.id) return;
    const interval = setInterval(() => fetchBroadcastDetail(selectedBroadcastId), 15000);
    return () => clearInterval(interval);
  }, [selectedBroadcastId, user?.id, fetchBroadcastDetail]);

  const loadBroadcasts = useCallback(() => {
    if (!user?.id || !isAdmin) return;
    setBroadcastHistoryLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      const headers: HeadersInit = {};
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      return fetch('/api/admin/notifications/broadcasts', { credentials: 'include', headers });
    })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setBroadcastGroups(Array.isArray(data) ? data : []))
      .catch(() => setBroadcastGroups([]))
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
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors" aria-label="Back to Admin">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </Link>
            <h1 className="text-lg font-semibold text-white">Notification Centre</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex gap-2 p-1 bg-slate-800/50 rounded-xl w-fit mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`px-6 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'create' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:text-slate-300'}`}
          >
            Create Notification
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sent')}
            className={`px-6 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'sent' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:text-slate-300'}`}
          >
            Sent Notifications
          </button>
        </div>

        {activeTab === 'create' && (
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Create Notification</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Title <span className="text-slate-500">(optional)</span></label>
                <input type="text" value={notificationTitle} onChange={(e) => setNotificationTitle(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white" placeholder="e.g. Announcement" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Message <span className="text-amber-400">*</span></label>
                <textarea value={notificationMessage} onChange={(e) => setNotificationMessage(e.target.value)} rows={3} required className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white resize-none" placeholder="Notification message..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Attachments <span className="text-slate-500">(optional)</span></label>
                <p className="text-xs text-slate-500 mb-2">Any file type, max 10 MB per file. Total attachments must be 4 MB or less.</p>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  id="notification-attachments"
                  onChange={(e) => {
                    const list = e.target.files ? Array.from(e.target.files) : [];
                    setNotificationAttachmentFiles((prev) => {
                      const combined = [...prev];
                      const names = new Set(prev.map((f) => f.name + f.size));
                      for (const f of list) if (!names.has(f.name + f.size)) { combined.push(f); names.add(f.name + f.size); }
                      return combined;
                    });
                    e.target.value = '';
                  }}
                />
                <div
                  className="rounded-xl border border-dashed border-slate-600 bg-slate-800/50 p-4 mb-2 min-h-[80px] flex flex-col justify-center"
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-amber-500/50', 'bg-slate-800'); }}
                  onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-amber-500/50', 'bg-slate-800'); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-amber-500/50', 'bg-slate-800');
                    const list = Array.from(e.dataTransfer.files);
                    setNotificationAttachmentFiles((prev) => {
                      const combined = [...prev];
                      const names = new Set(prev.map((f) => f.name + f.size));
                      for (const f of list) if (!names.has(f.name + f.size)) { combined.push(f); names.add(f.name + f.size); }
                      return combined;
                    });
                  }}
                >
                  <label htmlFor="notification-attachments" className="cursor-pointer text-slate-300 hover:text-amber-400 text-sm">Click to select files or drag and drop</label>
                </div>
                {notificationAttachmentFiles.length > 0 && (
                  <>
                    <ul className="space-y-2 rounded-xl bg-slate-800/50 border border-slate-700 p-2">
                      {notificationAttachmentFiles.map((f, i) => (
                        <li key={`${f.name}-${f.size}-${i}`} className="flex items-center justify-between gap-2 text-sm text-slate-200">
                          <span className="truncate" title={f.name}>{f.name}</span>
                          <span className="text-slate-500 shrink-0">{(f.size / 1024).toFixed(1)} KB</span>
                          <button type="button" onClick={() => setNotificationAttachmentFiles((prev) => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300 shrink-0">Remove</button>
                        </li>
                      ))}
                    </ul>
                    <p className={`mt-1 text-xs ${notificationAttachmentFiles.reduce((s, f) => s + f.size, 0) > MAX_TOTAL_ATTACHMENTS_BYTES ? 'text-amber-400' : 'text-slate-500'}`}>
                      Total: {(notificationAttachmentFiles.reduce((s, f) => s + f.size, 0) / (1024 * 1024)).toFixed(2)} MB (max 4 MB)
                    </p>
                  </>
                )}
                {notificationUploadProgress !== 'idle' && (
                  <p className="mt-2 text-sm text-slate-400">Uploading… {typeof notificationUploadProgress === 'number' ? `${notificationUploadProgress}%` : ''}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Recipients</label>
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="recipient" checked={notificationRecipientMode === 'all'} onChange={() => setNotificationRecipientMode('all')} className="rounded-full" />
                    <span className="text-white">All Members</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="recipient" checked={notificationRecipientMode === 'selected'} onChange={() => setNotificationRecipientMode('selected')} className="rounded-full" />
                    <span className="text-white">Selected Members</span>
                  </label>
                </div>
                {notificationRecipientMode === 'selected' && (
                  <div className="max-h-40 overflow-y-auto rounded-xl bg-slate-800 border border-slate-700 p-2 space-y-1">
                    {profiles.filter((p) => !p.is_admin).map((p) => (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-700/50">
                        <input type="checkbox" checked={notificationSelectedIds.has(p.id)} onChange={(e) => setNotificationSelectedIds((prev) => { const next = new Set(prev); if (e.target.checked) next.add(p.id); else next.delete(p.id); return next; })} className="rounded" />
                        <span className="text-slate-200">{p.full_name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {!notificationConfirmSend ? (
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => setNotificationConfirmSend(true)} disabled={!notificationMessage.trim() || (notificationRecipientMode === 'selected' && notificationSelectedIds.size === 0)} className="flex-1 min-w-[140px] px-5 py-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 font-medium disabled:opacity-50">Preview &amp; Confirm</button>
                  <button type="button" onClick={() => setNotificationConfirmSend(false)} className="px-5 py-3 rounded-xl bg-slate-700 text-slate-300">Cancel</button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700 text-sm text-slate-300">
                    <p><span className="text-slate-500">Recipients:</span> {notificationRecipientMode === 'all' ? `All members (${profiles.filter((p) => !p.is_admin).length})` : `${notificationSelectedIds.size} selected`}</p>
                    <p className="mt-1"><span className="text-slate-500">Message:</span> {notificationMessage.slice(0, 80)}{notificationMessage.length > 80 ? '...' : ''}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!user?.id || !notificationMessage.trim()) return;
                        setNotificationSending(true);
                        setNotificationUploadProgress(0);
                        try {
                          const totalSizeBytes = notificationAttachmentFiles.reduce((sum, f) => sum + f.size, 0);
                          if (totalSizeBytes > MAX_TOTAL_ATTACHMENTS_BYTES) {
                            alert(`Total attachments (${(totalSizeBytes / (1024 * 1024)).toFixed(1)} MB) exceed the 4 MB limit. Please remove some files.`);
                            setNotificationSending(false);
                            setNotificationUploadProgress('idle');
                            return;
                          }
                          const recipientIds = notificationRecipientMode === 'all' ? profiles.filter((p) => !p.is_admin).map((p) => p.id) : Array.from(notificationSelectedIds);
                          const form = new FormData();
                          form.append('title', notificationTitle.trim());
                          form.append('message', notificationMessage.trim());
                          form.append('recipientIds', JSON.stringify(recipientIds));
                          for (const f of notificationAttachmentFiles) form.append('files', f);
                          // #region agent log
                          const fileCount = notificationAttachmentFiles.length;
                          fetch('http://127.0.0.1:7242/ingest/9f9d758f-7a49-4eb9-9ee6-1128596866c4', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/admin/notifications/page.tsx:beforeSend', message: 'Notification send request', data: { fileCount, totalSizeBytes, totalSizeMB: (totalSizeBytes / (1024 * 1024)).toFixed(2) }, timestamp: Date.now(), hypothesisId: 'H1' }) }).catch(() => {});
                          // #endregion
                          const { data: { session } } = await supabase.auth.getSession();
                          const headers: HeadersInit = {};
                          if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
                          const res = await fetch('/api/admin/notifications/send', { method: 'POST', body: form, credentials: 'include', headers });
                          // #region agent log
                          fetch('http://127.0.0.1:7242/ingest/9f9d758f-7a49-4eb9-9ee6-1128596866c4', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/admin/notifications/page.tsx:afterSend', message: 'Notification send response', data: { status: res.status, ok: res.ok }, timestamp: Date.now(), hypothesisId: 'H2' }) }).catch(() => {});
                          // #endregion
                          setNotificationUploadProgress(100);
                          if (!res.ok) {
                            const j = await res.json().catch(() => ({}));
                            throw new Error(j.error || res.statusText || 'Send failed');
                          }
                          const j = await res.json();
                          alert(`Notification sent to ${j.sent ?? 0} member(s).`);
                          setNotificationTitle('');
                          setNotificationMessage('');
                          setNotificationAttachmentFiles([]);
                          setNotificationConfirmSend(false);
                          setNotificationSelectedIds(new Set());
                          loadBroadcasts();
                          setActiveTab('sent');
                        } catch (err: unknown) {
                          alert(err instanceof Error ? err.message : 'Failed to send');
                        } finally {
                          setNotificationSending(false);
                          setNotificationUploadProgress('idle');
                        }
                      }}
                      disabled={notificationSending || notificationAttachmentFiles.reduce((s, f) => s + f.size, 0) > MAX_TOTAL_ATTACHMENTS_BYTES}
                      className="flex-1 min-w-[140px] px-5 py-3 rounded-xl bg-amber-500 text-white font-medium disabled:opacity-50"
                    >
                      {notificationSending ? 'Sending...' : notificationAttachmentFiles.reduce((s, f) => s + f.size, 0) > MAX_TOTAL_ATTACHMENTS_BYTES ? 'Total attachments over 4 MB' : 'Confirm Send'}
                    </button>
                    <button type="button" onClick={() => setNotificationConfirmSend(false)} disabled={notificationSending} className="px-5 py-3 rounded-xl bg-slate-700 text-slate-300">Back</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'sent' && (
          <section>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-semibold text-white">Sent Notifications</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!user?.id) return;
                    const { data: { session } } = await supabase.auth.getSession();
                    const headers: HeadersInit = {};
                    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
                    const res = await fetch('/api/admin/notifications/export?scope=broadcasts', { credentials: 'include', headers });
                    if (!res.ok) return;
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'notification-history.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-700 text-slate-300 text-sm hover:bg-slate-600"
                >
                  Export CSV (broadcasts)
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!user?.id) return;
                    const { data: { session } } = await supabase.auth.getSession();
                    const headers: HeadersInit = {};
                    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
                    const res = await fetch('/api/admin/notifications/export?scope=all', { credentials: 'include', headers });
                    if (!res.ok) return;
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'notification-history-all.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-700 text-slate-300 text-sm hover:bg-slate-600"
                >
                  Export All (CSV)
                </button>
              </div>
            </div>
            {broadcastHistoryLoading ? (
              <p className="text-slate-500 text-sm">Loading…</p>
            ) : broadcastGroups.length === 0 ? (
              <p className="text-slate-500 text-sm">No broadcast notifications yet.</p>
            ) : (
              <div className="space-y-2">
                {broadcastGroups.map((g) => (
                  <div
                    key={g.broadcastGroupId}
                    className="flex items-stretch gap-2 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedBroadcastId(g.broadcastGroupId)}
                      className="flex-1 text-left p-4 min-w-0"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-white">{g.title || 'Announcement'}</span>
                        <span className="text-xs text-slate-500">{new Date(g.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-slate-400 mt-1 line-clamp-1">{g.messagePreview}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                        <span className="text-slate-500">{g.hasImage ? 'Image: Yes' : 'Image: No'}</span>
                        <span className="text-slate-500">Recipients: {g.totalRecipients}</span>
                        <span className="text-green-500">Read: {g.totalRead}</span>
                        <span className="text-amber-500">Unread: {g.totalUnread}</span>
                        <span className="text-blue-400">{g.readPercentage}% read</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!confirm('Delete this entire broadcast? It will be hidden from the list and export.')) return;
                        const { data: { session } } = await supabase.auth.getSession();
                        const headers: HeadersInit = {};
                        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
                        const res = await fetch(`/api/admin/notifications/delete?broadcastGroupId=${encodeURIComponent(g.broadcastGroupId)}`, { method: 'DELETE', credentials: 'include', headers });
                        if (res.ok) {
                          if (selectedBroadcastId === g.broadcastGroupId) { setSelectedBroadcastId(null); setBroadcastDetail(null); }
                          loadBroadcasts();
                        } else alert('Failed to delete');
                      }}
                      className="p-3 text-slate-400 hover:text-red-400 hover:bg-slate-700/50"
                      title="Delete broadcast"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Broadcast detail modal – full content + Read Receipts */}
      {selectedBroadcastId && (
        <div className="fixed inset-0 z-50 overflow-auto">
          <div className="absolute inset-0 bg-black/70" onClick={() => { setSelectedBroadcastId(null); setBroadcastDetail(null); }} aria-hidden="true" />
          <div className="relative flex min-h-full items-center justify-center p-4">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-700/50 bg-slate-900 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
                <h3 className="text-lg font-semibold text-white">Broadcast detail</h3>
                <button type="button" onClick={() => { setSelectedBroadcastId(null); setBroadcastDetail(null); }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">✕</button>
              </div>
              <div className="p-4 overflow-y-auto flex-1">
                {broadcastDetailLoading ? (
                  <p className="text-slate-500">Loading…</p>
                ) : broadcastDetail ? (
                  <div className="space-y-4">
                    {broadcastDetail.title && <h4 className="text-xl font-medium text-white">{broadcastDetail.title}</h4>}
                    <p className="text-slate-300 whitespace-pre-wrap">{broadcastDetail.message}</p>
                    <p className="text-xs text-slate-500">Sent: {new Date(broadcastDetail.createdAt).toLocaleString()}</p>
                    {broadcastDetail.attachments && broadcastDetail.attachments.length > 0 && (
                      <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-3">
                        <p className="text-xs text-slate-500 mb-2">Attachments</p>
                        <ul className="space-y-2">
                          {broadcastDetail.attachments.map((att) => (
                            <li key={att.id} className="flex items-center justify-between gap-2 text-sm">
                              <span className="text-slate-300 truncate" title={att.fileName}>{att.fileName}</span>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const { data: { session } } = await supabase.auth.getSession();
                                    const headers: HeadersInit = {};
                                    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
                                    const res = await fetch(`/api/notifications/attachment/${att.id}`, { credentials: 'include', headers });
                                    if (!res.ok) {
                                      const text = await res.text();
                                      let msg = 'Download failed';
                                      try {
                                        const j = JSON.parse(text);
                                        if (j?.error) msg = j.error;
                                      } catch { /* use default */ }
                                      alert(msg);
                                      return;
                                    }
                                    const blob = await res.blob();
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = att.fileName;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                  } catch {
                                    alert('Download failed. Please try again.');
                                  }
                                }}
                                className="shrink-0 px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30 text-xs font-medium"
                              >
                                Download
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="border border-slate-700/50 rounded-lg overflow-hidden">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-800/50 text-sm">
                        <span className="text-slate-300">Total Recipients: <strong>{broadcastDetail.totalRecipients}</strong></span>
                        <span className="text-green-500">Total Read: <strong>{broadcastDetail.totalRead}</strong></span>
                        <span className="text-amber-500">Total Unread: <strong>{broadcastDetail.totalUnread}</strong></span>
                        <span className="text-slate-300">Read %: <strong>{broadcastDetail.readPercentage}%</strong></span>
                      </div>
                      <p className="text-sm font-medium text-white px-3 pt-2 pb-1">Read Receipts</p>
                      <div className="overflow-x-auto max-h-60 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-slate-800/90 text-slate-400 text-left">
                            <tr>
                              <th className="px-3 py-2 font-medium">Recipient</th>
                              <th className="px-3 py-2 font-medium">Role</th>
                              <th className="px-3 py-2 font-medium">Status</th>
                              <th className="px-3 py-2 font-medium">Read At</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700/50">
                            {broadcastDetail.recipients.map((r) => (
                              <tr key={r.recipientId} className={r.read ? 'bg-slate-800/30' : 'bg-amber-500/5'}>
                                <td className="px-3 py-2 text-slate-200">{r.name || r.email || r.recipientId}</td>
                                <td className="px-3 py-2 text-slate-400">{r.role || '—'}</td>
                                <td className="px-3 py-2">
                                  <span className={r.read ? 'text-green-500 font-medium' : 'text-amber-500 font-medium'}>{r.read ? 'Read' : 'Unread'}</span>
                                </td>
                                <td className="px-3 py-2 text-slate-400">{r.read && r.readAt ? new Date(r.readAt).toLocaleString() : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {/* Reactions Summary + by User (admin analytics); polling keeps counts updated */}
                    <div className="border border-slate-700/50 rounded-lg overflow-hidden space-y-3">
                      <p className="text-sm font-medium text-white px-3 pt-3">Reactions Summary</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-3 pb-2 text-sm">
                        <span className="text-slate-300">👍 Like: <strong>{broadcastDetail.reactionsSummary?.LIKE ?? 0}</strong></span>
                        <span className="text-slate-300">💪 Strong Arm: <strong>{broadcastDetail.reactionsSummary?.MUSCLE ?? 0}</strong></span>
                        <span className="text-slate-300">😂 Laugh: <strong>{broadcastDetail.reactionsSummary?.LAUGH ?? 0}</strong></span>
                        <span className="text-slate-300">🫡 Copy That: <strong>{broadcastDetail.reactionsSummary?.COPY_THAT ?? 0}</strong></span>
                      </div>
                      {broadcastDetail.reactionsByUser && broadcastDetail.reactionsByUser.length > 0 && (
                          <>
                            <p className="text-sm font-medium text-white px-3 pt-2">Reactions by User</p>
                            <div className="overflow-x-auto max-h-40 overflow-y-auto px-3 pb-3">
                              <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-slate-800/90 text-slate-400 text-left">
                                  <tr>
                                    <th className="py-2 font-medium">User Name</th>
                                    <th className="py-2 font-medium">Reaction</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50">
                                  {broadcastDetail.reactionsByUser.map((u, i) => (
                                    <tr key={`${u.userName}-${i}`} className="text-slate-200">
                                      <td className="py-1.5">{u.userName}</td>
                                      <td className="py-1.5">
                                        {u.reactionType === 'LIKE' && '👍'}
                                        {u.reactionType === 'MUSCLE' && '💪'}
                                        {u.reactionType === 'LAUGH' && '😂'}
                                        {u.reactionType === 'COPY_THAT' && '🫡'}
                                        {!['LIKE', 'MUSCLE', 'LAUGH', 'COPY_THAT'].includes(u.reactionType) && u.reactionType}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500">Could not load broadcast.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
