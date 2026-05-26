'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAdminData } from '../AdminDataProvider';
import { supabase, type Profile } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { AdminDateControls, AdminPanel, EmptyState, SegmentedControl } from '../admin-ui';
import { getDatePresetRange, getDateRangeFromSearchParams, type NotificationTab } from '../admin-utils';

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

function parseCategory(title: string | null) {
  if (!title) return { category: 'Info', cleanTitle: 'Broadcast' };
  if (title.startsWith('[Warning] ')) return { category: 'Warning', cleanTitle: title.replace('[Warning] ', '') };
  if (title.startsWith('[Urgent] ')) return { category: 'Urgent', cleanTitle: title.replace('[Urgent] ', '') };
  if (title.startsWith('[Info] ')) return { category: 'Info', cleanTitle: title.replace('[Info] ', '') };
  return { category: 'Info', cleanTitle: title };
}

export default function NotificationsPageImpl() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, profile, loading, isAdmin } = useAuth();
  const { profiles: cachedProfiles } = useAdminData();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<'Info' | 'Warning' | 'Urgent'>('Info');
  const [recipientMode, setRecipientMode] = useState<'all' | 'selected'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(true);
  const [broadcastGroups, setBroadcastGroups] = useState<BroadcastGroup[]>([]);
  const [broadcastHistoryLoading, setBroadcastHistoryLoading] = useState(false);
  const [selectedBroadcastId, setSelectedBroadcastId] = useState<string | null>(null);
  const [broadcastDetail, setBroadcastDetail] = useState<BroadcastDetail | null>(null);
  const [broadcastDetailLoading, setBroadcastDetailLoading] = useState(false);

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

  const profiles = useMemo<Profile[]>(
    () => cachedProfiles.filter((item) => item.is_active),
    [cachedProfiles]
  );

  const dateRange = useMemo(
    () => getDateRangeFromSearchParams(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );
  const activeTab: NotificationTab = (searchParams.get('tab') as NotificationTab | null) === 'sent' ? 'sent' : 'created';

  const updateParams = (updater: (params: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams.toString());
    updater(next);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const setPreset = (preset: '1d' | '7d' | '30d' | '90d' | '365d') => {
    const range = getDatePresetRange(preset);
    updateParams((params) => {
      params.set('preset', range.preset);
      params.set('startDate', range.startDate);
      params.set('endDate', range.endDate);
    });
  };

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
    const response = await fetch(`/api/admin/notifications/broadcasts/${encodeURIComponent(broadcastId)}`, {
      credentials: 'include',
      headers,
    });
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
    if (!selectedBroadcastId) {
      setBroadcastDetail(null);
      return;
    }
    setBroadcastDetailLoading(true);
    setBroadcastDetail(null);
    fetchBroadcastDetail(selectedBroadcastId).finally(() => setBroadcastDetailLoading(false));
  }, [selectedBroadcastId, fetchBroadcastDetail]);

  const availableRecipients = useMemo(
    () => profiles.filter((item) => item.id !== user?.id),
    [profiles, user?.id]
  );

  const filteredBroadcastGroups = useMemo(
    () =>
      broadcastGroups.filter((group) => {
        const created = new Date(group.createdAt).getTime();
        const start = new Date(`${dateRange.startDate}T00:00:00`).getTime();
        const end = new Date(`${dateRange.endDate}T23:59:59`).getTime();
        return created >= start && created <= end;
      }),
    [broadcastGroups, dateRange]
  );

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
    const recipientIds = recipientMode === 'all' ? availableRecipients.map((item) => item.id) : Array.from(selectedIds);
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
      formData.append('title', `[${category}] ${title.trim() || 'Broadcast'}`);
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
      setCategory('Info');
      setRecipientMode('all');
      setSelectedIds(new Set());
      setSendSuccess(`Broadcast sent to ${data?.sent ?? recipientIds.length} recipient(s).`);
      setComposerOpen(false);
      updateParams((params) => {
        params.set('tab', 'sent');
      });
      await loadBroadcasts();
    } catch {
      setSendError('Failed to send notification.');
    } finally {
      setSending(false);
    }
  };

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">Loading...</div>;
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 text-white">
      <section className="mb-8">
        <h1 className="text-3xl font-semibold text-white">Notifications</h1>
        <p className="mt-2 text-sm text-slate-400">
          Create team broadcasts and review sent history with shared date filters, categories, and attachment previews.
        </p>
      </section>

      <div className="mb-6">
        <AdminDateControls
          range={dateRange}
          onPresetChange={setPreset}
          onStartDateChange={(value) => {
            updateParams((params) => {
              params.set('preset', 'custom');
              params.set('startDate', value);
              params.set('endDate', dateRange.endDate);
            });
          }}
          onEndDateChange={(value) => {
            updateParams((params) => {
              params.set('preset', 'custom');
              params.set('startDate', dateRange.startDate);
              params.set('endDate', value);
            });
          }}
          compact
        />
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <SegmentedControl
          value={activeTab}
          onChange={(value) => {
            updateParams((params) => {
              params.set('tab', value);
            });
          }}
          options={[
            { value: 'created', label: 'Created' },
            { value: 'sent', label: 'Sent' },
          ]}
        />

        {activeTab === 'created' && (
          <button type="button" onClick={() => setComposerOpen((current) => !current)} className="rounded-2xl bg-blue-500/20 px-4 py-2.5 text-sm font-medium text-blue-300">
            {composerOpen ? 'Hide create form' : 'Create notification'}
          </button>
        )}
      </div>

      {activeTab === 'created' ? (
        <div className="space-y-6">
          <AdminPanel title="Created by">
            <div className="flex items-center gap-4 rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-500 text-lg font-bold text-white">
                {profile?.avatar || profile?.full_name?.charAt(0) || 'A'}
              </div>
              <div>
                <p className="text-base font-semibold text-white">{profile?.full_name || 'Admin'}</p>
                <p className="text-sm text-slate-500">{profile?.role || 'Administrator'} • Admin creator</p>
              </div>
            </div>
          </AdminPanel>

          {composerOpen && (
            <AdminPanel title="Create broadcast">
              <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm text-slate-400">Title</span>
                    <input type="text" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Broadcast title" className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-blue-500" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm text-slate-400">Message</span>
                    <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write the message that should reach the team..." rows={6} className="w-full resize-none rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-blue-500" />
                  </label>
                  <div>
                    <span className="mb-2 block text-sm text-slate-400">Attachments</span>
                    <input type="file" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} className="block w-full text-sm text-slate-400 file:mr-4 file:rounded-2xl file:border-0 file:bg-slate-800 file:px-4 file:py-2.5 file:text-slate-200" />
                    {files.length > 0 && (
                      <div className="mt-3 grid gap-2">
                        {files.map((file) => (
                          <div key={`${file.name}-${file.size}`} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                            <span className="truncate text-sm text-white">{file.name}</span>
                            <span className="text-xs text-slate-500">{formatFileSize(file.size)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                    <p className="text-sm font-medium text-white">Category</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(['Info', 'Warning', 'Urgent'] as const).map((item) => (
                        <button key={item} type="button" onClick={() => setCategory(item)} className={`rounded-2xl px-4 py-2 text-sm font-medium ${category === item ? item === 'Urgent' ? 'bg-rose-500/20 text-rose-300' : item === 'Warning' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300' : 'bg-slate-800 text-slate-400'}`}>
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                    <p className="text-sm font-medium text-white">Targeting</p>
                    <div className="mt-4 flex gap-2">
                      <button type="button" onClick={() => setRecipientMode('all')} className={`rounded-2xl px-4 py-2 text-sm font-medium ${recipientMode === 'all' ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-800 text-slate-400'}`}>All users</button>
                      <button type="button" onClick={() => setRecipientMode('selected')} className={`rounded-2xl px-4 py-2 text-sm font-medium ${recipientMode === 'selected' ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-800 text-slate-400'}`}>Selected users</button>
                    </div>
                    {recipientMode === 'selected' && (
                      <div className="mt-4 grid gap-2">
                        {availableRecipients.map((item) => {
                          const checked = selectedIds.has(item.id);
                          return (
                            <button key={item.id} type="button" onClick={() => handleToggleRecipient(item.id)} className={`rounded-2xl border px-4 py-3 text-left ${checked ? 'border-blue-500/30 bg-blue-500/10 text-white' : 'border-slate-800 bg-slate-900 text-slate-300'}`}>
                              <p className="font-medium">{item.full_name || item.email}</p>
                              <p className="text-xs text-slate-500">{item.role}</p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {sendError && <p className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{sendError}</p>}
                  {sendSuccess && <p className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{sendSuccess}</p>}

                  <button type="button" onClick={() => void handleSend()} disabled={sending} className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-3 text-sm font-medium text-white disabled:opacity-60">
                    {sending ? 'Sending...' : 'Send broadcast'}
                  </button>
                </div>
              </div>
            </AdminPanel>
          )}

          <AdminPanel title="Created broadcasts">
            {broadcastHistoryLoading ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-950/70 px-4 py-10 text-center text-slate-400">Loading created broadcasts...</div>
            ) : filteredBroadcastGroups.length === 0 ? (
              <EmptyState title="No created broadcasts found" description="Your created broadcasts in the selected date range will appear here." />
            ) : (
              <div className="space-y-3">
                {filteredBroadcastGroups.map((group) => {
                  const { category: badgeCategory, cleanTitle } = parseCategory(group.title);
                  return (
                    <div key={`created-${group.broadcastGroupId}`} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeCategory === 'Urgent' ? 'bg-rose-500/20 text-rose-300' : badgeCategory === 'Warning' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'}`}>{badgeCategory}</span>
                            <p className="truncate text-sm font-semibold text-white">{cleanTitle}</p>
                          </div>
                          <p className="mt-2 text-sm text-slate-400">{group.messagePreview}</p>
                          <p className="mt-2 text-xs text-slate-500">Created by {profile?.full_name || 'Admin'} • {new Date(group.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="rounded-full bg-slate-900 px-3 py-1">{group.totalRecipients} recipients</span>
                          <span className="rounded-full bg-slate-900 px-3 py-1">{group.totalRead} read</span>
                          {group.hasImage && <span className="rounded-full bg-slate-900 px-3 py-1 text-cyan-300">Attachments</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </AdminPanel>
        </div>
      ) : (
        <AdminPanel title="Sent broadcasts">
          {broadcastHistoryLoading ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-950/70 px-4 py-10 text-center text-slate-400">Loading sent notifications...</div>
          ) : filteredBroadcastGroups.length === 0 ? (
            <EmptyState title="No sent notifications found" description="Try another date range or send your first broadcast." />
          ) : (
            <div className="space-y-3">
              {filteredBroadcastGroups.map((group) => {
                const expanded = selectedBroadcastId === group.broadcastGroupId;
                const { category: badgeCategory, cleanTitle } = parseCategory(group.title);
                return (
                  <div key={group.broadcastGroupId} className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/70">
                    <button type="button" onClick={() => setSelectedBroadcastId(expanded ? null : group.broadcastGroupId)} className="w-full px-4 py-4 text-left hover:bg-slate-900/70">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeCategory === 'Urgent' ? 'bg-rose-500/20 text-rose-300' : badgeCategory === 'Warning' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'}`}>{badgeCategory}</span>
                            <p className="truncate text-sm font-semibold text-white">{cleanTitle}</p>
                          </div>
                          <p className="mt-2 truncate text-sm text-slate-400">{group.messagePreview}</p>
                          <p className="mt-2 text-xs text-slate-500">Created by {profile?.full_name || 'Admin'} • {new Date(group.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span>{group.totalRecipients} recipients</span>
                          <span>{group.totalRead} read</span>
                          <span>{group.readPercentage}%</span>
                        </div>
                      </div>
                    </button>

                    {expanded && (
                      <div className="border-t border-slate-800 px-4 py-4">
                        {broadcastDetailLoading ? (
                          <p className="text-sm text-slate-400">Loading details...</p>
                        ) : broadcastDetail ? (
                          <div className="space-y-4">
                            <p className="whitespace-pre-wrap text-sm text-slate-200">{broadcastDetail.message}</p>
                            {broadcastDetail.attachments && broadcastDetail.attachments.length > 0 && (
                              <div>
                                <p className="mb-3 text-sm font-medium text-white">Attachment thumbnails</p>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                  {broadcastDetail.attachments.map((attachment) => (
                                    <a key={attachment.id} href={`/api/notifications/attachment/${attachment.id}`} target="_blank" rel="noreferrer" className="rounded-3xl border border-slate-800 bg-slate-900/80 p-3">
                                      {attachment.fileType.startsWith('image/') ? (
                                        <img src={`/api/notifications/attachment/${attachment.id}`} alt={attachment.fileName} className="mb-3 h-28 w-full rounded-2xl object-cover" />
                                      ) : (
                                        <div className="mb-3 flex h-28 items-center justify-center rounded-2xl bg-slate-950 text-2xl">📎</div>
                                      )}
                                      <p className="truncate text-sm text-white">{attachment.fileName}</p>
                                      <p className="text-xs text-slate-500">{formatFileSize(attachment.fileSize)}</p>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="grid gap-3 sm:grid-cols-4 text-sm">
                              <div className="rounded-2xl bg-slate-900 px-3 py-2">Total: {broadcastDetail.totalRecipients}</div>
                              <div className="rounded-2xl bg-slate-900 px-3 py-2">Read: {broadcastDetail.totalRead}</div>
                              <div className="rounded-2xl bg-slate-900 px-3 py-2">Unread: {broadcastDetail.totalUnread}</div>
                              <div className="rounded-2xl bg-slate-900 px-3 py-2">Read %: {broadcastDetail.readPercentage}%</div>
                            </div>

                            <div className="space-y-2">
                              {broadcastDetail.recipients.map((recipient) => (
                                <div key={recipient.recipientId} className="rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-3">
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                      <p className="text-sm text-white">{recipient.name || recipient.email || recipient.recipientId}</p>
                                      <p className="text-xs text-slate-500">{recipient.role || 'Unknown role'}</p>
                                    </div>
                                    <div className="text-xs">
                                      <span className={recipient.read ? 'text-emerald-400' : 'text-amber-400'}>{recipient.read ? 'Read' : 'Unread'}</span>
                                      <p className="text-slate-500">{recipient.readAt ? new Date(recipient.readAt).toLocaleString() : 'Not opened yet'}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400">Could not load broadcast details.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </AdminPanel>
      )}
    </main>
  );
}
