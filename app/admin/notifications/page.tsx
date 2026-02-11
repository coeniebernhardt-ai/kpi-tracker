'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { supabase, getAllProfiles, sendAdminBroadcast } from '../../lib/supabase';
import type { Profile } from '../../lib/supabase';

type NotificationCentreTab = 'create' | 'sent';

export default function NotificationCentrePage() {
  const router = useRouter();
  const { user, loading, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<NotificationCentreTab>('create');

  // Create Notification tab state
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationImageUrl, setNotificationImageUrl] = useState<string | null>(null);
  const [notificationImageFile, setNotificationImageFile] = useState<File | null>(null);
  const [notificationRecipientMode, setNotificationRecipientMode] = useState<'all' | 'selected'>('all');
  const [notificationSelectedIds, setNotificationSelectedIds] = useState<Set<string>>(new Set());
  const [notificationConfirmSend, setNotificationConfirmSend] = useState(false);
  const [notificationSending, setNotificationSending] = useState(false);

  // Sent Notifications tab state (reuse Notification History)
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [broadcastGroups, setBroadcastGroups] = useState<Array<{ broadcastGroupId: string; title: string | null; messagePreview: string; hasImage: boolean; createdAt: string; totalRecipients: number; totalRead: number; readPercentage: number; totalUnread: number }>>([]);
  const [broadcastHistoryLoading, setBroadcastHistoryLoading] = useState(false);
  const [selectedBroadcastId, setSelectedBroadcastId] = useState<string | null>(null);
  const [broadcastDetail, setBroadcastDetail] = useState<{ broadcastGroupId: string; title: string | null; message: string; imageUrl: string | null; createdAt: string; totalRecipients: number; totalRead: number; totalUnread: number; readPercentage: number; recipients: Array<{ recipientId: string; name: string; email: string; role: string; read: boolean; readAt: string | null }>; reactionsSummary?: { LIKE: number; MUSCLE: number; LAUGH: number; COPY_THAT: number }; reactionsByUser?: Array<{ userName: string; reactionType: string }> } | null>(null);
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
                <label className="block text-sm font-medium text-slate-300 mb-2">Image <span className="text-slate-500">(optional)</span></label>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" id="notification-image-file" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setNotificationImageFile(f); setNotificationImageUrl(null); } }} />
                    <label htmlFor="notification-image-file" className="flex-1 min-w-[140px] px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-center cursor-pointer hover:bg-slate-700">Upload (jpg, png, webp)</label>
                    <input type="url" value={notificationImageUrl ?? ''} onChange={(e) => { setNotificationImageUrl(e.target.value || null); setNotificationImageFile(null); }} placeholder="Or paste image URL" className="flex-1 min-w-[140px] px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm" />
                  </div>
                  {(notificationImageFile || notificationImageUrl) && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-slate-700 bg-slate-800/50">
                      <p className="text-xs text-slate-500 px-2 py-1">Preview</p>
                      {notificationImageFile ? (
                        <img src={URL.createObjectURL(notificationImageFile)} alt="Preview" className="w-full max-h-40 object-contain" />
                      ) : notificationImageUrl ? (
                        <img src={notificationImageUrl} alt="Preview" className="w-full max-h-40 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : null}
                    </div>
                  )}
                </div>
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
                        try {
                          let imageUrl: string | null = notificationImageUrl || null;
                          if (notificationImageFile) {
                            const form = new FormData();
                            form.append('file', notificationImageFile);
                            form.append('userId', user.id);
                            const res = await fetch('/api/admin/upload-notification-image', { method: 'POST', body: form });
                            if (!res.ok) { const j = await res.json(); throw new Error(j.error || 'Upload failed'); }
                            const j = await res.json(); imageUrl = j.url ?? null;
                          }
                          const recipientIds = notificationRecipientMode === 'all' ? profiles.filter((p) => !p.is_admin).map((p) => p.id) : Array.from(notificationSelectedIds);
                          const { sent } = await sendAdminBroadcast(user.id, { title: notificationTitle.trim() || undefined, message: notificationMessage.trim(), image_url: imageUrl }, recipientIds);
                          alert(`Notification sent to ${sent} member(s).`);
                          setNotificationTitle(''); setNotificationMessage(''); setNotificationImageUrl(null); setNotificationImageFile(null); setNotificationConfirmSend(false); setNotificationSelectedIds(new Set());
                          loadBroadcasts();
                          setActiveTab('sent');
                        } catch (err: unknown) {
                          alert(err instanceof Error ? err.message : 'Failed to send');
                        } finally {
                          setNotificationSending(false);
                        }
                      }}
                      disabled={notificationSending}
                      className="flex-1 min-w-[140px] px-5 py-3 rounded-xl bg-amber-500 text-white font-medium disabled:opacity-50"
                    >
                      {notificationSending ? 'Sending...' : 'Confirm Send'}
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
              <button
                type="button"
                onClick={async () => {
                  if (!user?.id) return;
                  const { data: { session } } = await supabase.auth.getSession();
                  const headers: HeadersInit = {};
                  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
                  const res = await fetch('/api/admin/notifications/export', { credentials: 'include', headers });
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
                Export CSV
              </button>
            </div>
            {broadcastHistoryLoading ? (
              <p className="text-slate-500 text-sm">Loading…</p>
            ) : broadcastGroups.length === 0 ? (
              <p className="text-slate-500 text-sm">No broadcast notifications yet.</p>
            ) : (
              <div className="space-y-2">
                {broadcastGroups.map((g) => (
                  <button
                    key={g.broadcastGroupId}
                    type="button"
                    onClick={() => setSelectedBroadcastId(g.broadcastGroupId)}
                    className="w-full text-left p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600"
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
