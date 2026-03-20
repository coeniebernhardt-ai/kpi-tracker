'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAllProfiles, supabase, type Profile } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

type Tab = 'create' | 'sent';

type BroadcastGroup = {
  broadcastGroupId: string;
  title: string | null;
  messagePreview: string;
  hasImage: boolean;
  createdAt: string;
  totalRecipients: number;
  totalRead: number;
  readPercentage: number;
  totalUnread: number;
};

type BroadcastDetail = {
  broadcastGroupId: string;
  title: string | null;
  message: string;
  imageUrl: string | null;
  createdAt: string;
  totalRecipients: number;
  totalRead: number;
  totalUnread: number;
  readPercentage: number;
  recipients: Array<{
    recipientId: string;
    name: string;
    email: string;
    role: string;
    read: boolean;
    readAt: string | null;
  }>;
  reactionsSummary?: {
    LIKE: number;
    MUSCLE: number;
    LAUGH: number;
    COPY_THAT: number;
  };
  reactionsByUser?: Array<{
    userName: string;
    reactionType: string;
  }>;
  attachments?: Array<{
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }>;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NotificationCentrePage() {
  const router = useRouter();
  const { user, loading, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('create');
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [recipientMode, setRecipientMode] = useState<'all' | 'selected'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  const [broadcastGroups, setBroadcastGroups] = useState<BroadcastGroup[]>([]);
  const [broadcastHistoryLoading, setBroadcastHistoryLoading] = useState(false);
  const [selectedBroadcastId, setSelectedBroadcastId] = useState<string | null>(null);
  const [broadcastDetail, setBroadcastDetail] = useState<BroadcastDetail | null>(null);
  const [broadcastDetailLoading, setBroadcastDetailLoading] = useState(false);
  const [sentStartDate, setSentStartDate] = useState('');
  const [sentEndDate, setSentEndDate] = useState('');

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

  useEffect(() => {
    let cancelled = false;
    getAllProfiles()
      .then((data) => {
        if (!cancelled) {
          setProfiles(data.filter((profile) => profile.is_active));
        }
      })
      .catch(() => {
        if (!cancelled) setProfiles([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadBroadcasts = useCallback(async () => {
    if (!user?.id || !isAdmin) return;

    setBroadcastHistoryLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = {};
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

      const response = await fetch('/api/admin/notifications/broadcasts', {
        credentials: 'include',
        headers,
      });

      if (!response.ok) {
        setBroadcastGroups([]);
        return;
      }

      const data = await response.json();
      setBroadcastGroups(Array.isArray(data) ? data : []);
    } catch {
      setBroadcastGroups([]);
    } finally {
      setBroadcastHistoryLoading(false);
    }
  }, [user?.id, isAdmin]);

  const fetchBroadcastDetail = useCallback(async (broadcastId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: HeadersInit = {};
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

    const response = await fetch(
      `/api/admin/notifications/broadcasts/${encodeURIComponent(broadcastId)}`,
      {
        credentials: 'include',
        headers,
      }
    );

    if (!response.ok) {
      setBroadcastDetail(null);
      return;
    }

    const data = await response.json();
    setBroadcastDetail(data);
  }, []);

  useEffect(() => {
    void loadBroadcasts();
  }, [loadBroadcasts]);

  useEffect(() => {
    if (!selectedBroadcastId || !user?.id) {
      setBroadcastDetail(null);
      return;
    }

    setBroadcastDetailLoading(true);
    setBroadcastDetail(null);

    fetchBroadcastDetail(selectedBroadcastId)
      .finally(() => setBroadcastDetailLoading(false));
  }, [selectedBroadcastId, user?.id, fetchBroadcastDetail]);

  const availableRecipients = useMemo(
    () => profiles.filter((profile) => profile.id !== user?.id),
    [profiles, user?.id]
  );

  const filteredBroadcastGroups = useMemo(() => {
    return broadcastGroups.filter((group) => {
      const createdAt = new Date(group.createdAt);

      if (sentStartDate) {
        const start = new Date(`${sentStartDate}T00:00:00`);
        if (createdAt < start) return false;
      }

      if (sentEndDate) {
        const end = new Date(`${sentEndDate}T23:59:59`);
        if (createdAt > end) return false;
      }

      return true;
    });
  }, [broadcastGroups, sentStartDate, sentEndDate]);

  const handleToggleRecipient = (profileId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(profileId)) next.delete(profileId);
      else next.add(profileId);
      return next;
    });
  };

  const handleSend = async () => {
    if (!user?.id) return;
    if (!message.trim()) {
      setSendError('Message is required.');
      return;
    }

    const recipientIds =
      recipientMode === 'all'
        ? availableRecipients.map((profile) => profile.id)
        : Array.from(selectedIds);

    if (recipientIds.length === 0) {
      setSendError('Choose at least one recipient.');
      return;
    }

    setSending(true);
    setSendError(null);
    setSendSuccess(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = {};
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('message', message.trim());
      formData.append('recipientIds', JSON.stringify(recipientIds));
      files.forEach((file) => formData.append('files', file));

      const response = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setSendError(data?.error ?? 'Failed to send notification.');
        return;
      }

      setTitle('');
      setMessage('');
      setFiles([]);
      setRecipientMode('all');
      setSelectedIds(new Set());
      setSendSuccess(`Notification sent to ${data?.sent ?? recipientIds.length} recipient(s).`);
      setActiveTab('sent');
      await loadBroadcasts();
    } catch {
      setSendError('Failed to send notification.');
    } finally {
      setSending(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-8 text-white">
      <section className="mb-6">
        <h1 className="text-3xl font-bold text-white">Notifications</h1>
        <p className="mt-2 text-sm text-slate-400">
          Send broadcasts to the team and review delivery history from a dedicated page.
        </p>
      </section>

      <section>
        <div className="mb-6 flex gap-2 flex-wrap border-b border-slate-800/80 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`px-6 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'create'
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
            }`}
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sent')}
            className={`px-6 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'sent'
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
            }`}
          >
            Sent
          </button>
        </div>

        {activeTab === 'create' && (
          <section className="rounded-2xl border border-slate-700/50 bg-slate-900 p-6 space-y-5">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (optional)"
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Notification message..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Attachments</label>
              <input
                type="file"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                className="block w-full text-sm text-slate-400 file:mr-4 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-slate-800 file:text-slate-200"
              />
              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {files.map((file) => (
                    <div
                      key={`${file.name}-${file.size}`}
                      className="flex items-center justify-between rounded-lg bg-slate-800/70 px-3 py-2 text-sm"
                    >
                      <span className="truncate">{file.name}</span>
                      <span className="text-slate-500">{formatFileSize(file.size)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setRecipientMode('all')}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    recipientMode === 'all'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Send to all
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientMode('selected')}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    recipientMode === 'selected'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Select recipients
                </button>
              </div>

              {recipientMode === 'selected' && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {availableRecipients.map((profile) => {
                    const checked = selectedIds.has(profile.id);
                    return (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => handleToggleRecipient(profile.id)}
                        className={`rounded-xl border px-4 py-3 text-left transition ${
                          checked
                            ? 'border-blue-500 bg-blue-500/10 text-white'
                            : 'border-slate-700 bg-slate-800/60 text-slate-300'
                        }`}
                      >
                        <p className="font-medium">{profile.full_name || profile.email}</p>
                        <p className="text-xs text-slate-500">{profile.role}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {sendError && (
              <p className="rounded-lg bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{sendError}</p>
            )}
            {sendSuccess && (
              <p className="rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{sendSuccess}</p>
            )}

            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={sending}
              className="w-full py-3 rounded-xl bg-amber-500 text-slate-950 font-medium disabled:opacity-60"
            >
              {sending ? 'Sending...' : 'Preview & Confirm'}
            </button>
          </section>
        )}

        {activeTab === 'sent' && (
          <section className="space-y-4">
            <section className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={sentStartDate}
                  onChange={(e) => setSentStartDate(e.target.value)}
                  className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">End Date</label>
                <input
                  type="date"
                  value={sentEndDate}
                  onChange={(e) => setSentEndDate(e.target.value)}
                  className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm outline-none focus:border-blue-500"
                />
              </div>
            </section>

            <div className="space-y-3">
              {broadcastHistoryLoading ? (
                <div className="rounded-xl bg-slate-900 border border-slate-700 p-4 text-slate-400">
                  Loading sent notifications...
                </div>
              ) : filteredBroadcastGroups.length === 0 ? (
                <div className="rounded-xl bg-slate-900 border border-slate-700 p-4 text-slate-400">
                  No sent notifications found for the selected range.
                </div>
              ) : (
                filteredBroadcastGroups.map((group) => {
                  const isExpanded = selectedBroadcastId === group.broadcastGroupId;
                  return (
                    <div
                      key={group.broadcastGroupId}
                      className="rounded-xl border border-slate-700 bg-slate-900 overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedBroadcastId(
                            isExpanded ? null : group.broadcastGroupId
                          )
                        }
                        className="w-full px-4 py-4 text-left hover:bg-slate-800/40 transition"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="min-w-0">
                            <p className="font-medium text-white truncate">
                              {group.title || group.messagePreview || 'Untitled notification'}
                            </p>
                            <p className="text-sm text-slate-400 truncate">
                              {group.messagePreview}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span>{new Date(group.createdAt).toLocaleString()}</span>
                            <span>{group.totalRecipients} recipients</span>
                            <span>{group.totalRead} read</span>
                            <span>{group.readPercentage}%</span>
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-slate-800 px-4 py-4 space-y-4">
                          {broadcastDetailLoading ? (
                            <p className="text-sm text-slate-400">Loading details...</p>
                          ) : broadcastDetail ? (
                            <>
                              <div className="space-y-2">
                                <p className="text-sm text-slate-500">
                                  Sent {new Date(broadcastDetail.createdAt).toLocaleString()}
                                </p>
                                <p className="whitespace-pre-wrap text-slate-200">
                                  {broadcastDetail.message}
                                </p>
                                {broadcastDetail.imageUrl && (
                                  <a
                                    href={broadcastDetail.imageUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-block"
                                  >
                                    <img
                                      src={broadcastDetail.imageUrl}
                                      alt="Notification"
                                      className="max-h-48 rounded-xl border border-slate-700"
                                    />
                                  </a>
                                )}
                              </div>

                              {broadcastDetail.attachments && broadcastDetail.attachments.length > 0 && (
                                <div className="space-y-3">
                                  <p className="text-sm font-medium text-white">Attachments</p>
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    {broadcastDetail.attachments.map((att) => (
                                      <a
                                        key={att.id}
                                        href={`/api/notifications/attachment/${att.id}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="rounded-xl border border-slate-700 bg-slate-800/60 p-3 hover:bg-slate-800"
                                      >
                                        {att.fileType.startsWith('image/') ? (
                                          <img
                                            src={`/api/notifications/attachment/${att.id}`}
                                            alt={att.fileName}
                                            className="mb-3 h-28 w-full rounded-lg object-cover"
                                          />
                                        ) : (
                                          <div className="mb-3 flex h-28 items-center justify-center rounded-lg bg-slate-900 text-2xl">
                                            📎
                                          </div>
                                        )}
                                        <p className="truncate text-sm text-white">{att.fileName}</p>
                                        <p className="text-xs text-slate-500">
                                          {att.fileType} · {formatFileSize(att.fileSize)}
                                        </p>
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="grid gap-3 sm:grid-cols-4 text-sm">
                                <div className="rounded-lg bg-slate-800/60 px-3 py-2">
                                  Total: {broadcastDetail.totalRecipients}
                                </div>
                                <div className="rounded-lg bg-slate-800/60 px-3 py-2">
                                  Read: {broadcastDetail.totalRead}
                                </div>
                                <div className="rounded-lg bg-slate-800/60 px-3 py-2">
                                  Unread: {broadcastDetail.totalUnread}
                                </div>
                                <div className="rounded-lg bg-slate-800/60 px-3 py-2">
                                  Read %: {broadcastDetail.readPercentage}%
                                </div>
                              </div>

                              <div className="space-y-2">
                                <p className="text-sm font-medium text-white">Recipients</p>
                                <div className="space-y-2">
                                  {broadcastDetail.recipients.map((recipient) => (
                                    <div
                                      key={recipient.recipientId}
                                      className="rounded-lg bg-slate-800/50 px-3 py-3"
                                    >
                                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                          <p className="text-sm text-white">
                                            {recipient.name || recipient.email || recipient.recipientId}
                                          </p>
                                          <p className="text-xs text-slate-500">
                                            {recipient.role || 'Unknown role'}
                                          </p>
                                        </div>
                                        <div className="text-xs">
                                          <span className={recipient.read ? 'text-emerald-400' : 'text-amber-400'}>
                                            {recipient.read ? 'Read' : 'Unread'}
                                          </span>
                                          <p className="text-slate-500">
                                            {recipient.readAt
                                              ? new Date(recipient.readAt).toLocaleString()
                                              : 'Not opened yet'}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          ) : (
                            <p className="text-sm text-slate-400">Could not load broadcast details.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}