/** Durable local outbox for Member Technical Work mutations while offline. */

export type OutboxItem = {
  id: string;
  createdAt: string;
  supportCallId: string;
  path: string;
  body: unknown;
  idempotencyKey: string;
  status: 'pending' | 'syncing' | 'failed' | 'conflict';
  lastError?: string;
  clientUpdatedAt?: string;
};

const KEY = 'thinkq_sc_outbox_v1';

function read(): OutboxItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OutboxItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: OutboxItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function listOutbox(supportCallId?: string): OutboxItem[] {
  const all = read();
  return supportCallId ? all.filter((i) => i.supportCallId === supportCallId) : all;
}

export function enqueueOutbox(item: Omit<OutboxItem, 'id' | 'createdAt' | 'status'>): OutboxItem {
  const row: OutboxItem = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: 'pending',
  };
  const all = read();
  all.push(row);
  write(all);
  return row;
}

export function updateOutbox(id: string, patch: Partial<OutboxItem>) {
  write(read().map((i) => (i.id === id ? { ...i, ...patch } : i)));
}

export function removeOutbox(id: string) {
  write(read().filter((i) => i.id !== id));
}

export function isNetworkError(e: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const msg = e instanceof Error ? e.message : String(e);
  return /failed to fetch|network|offline|timeout|Load failed/i.test(msg);
}

type FlushOpts = {
  accessToken: string | null;
  supportCallId: string;
  post: (path: string, body: unknown, headers?: Record<string, string>) => Promise<unknown>;
  onConflict?: (item: OutboxItem, serverHint: unknown) => Promise<void>;
};

/** Flush pending items in order. Returns counts. */
export async function flushOutbox(opts: FlushOpts): Promise<{ synced: number; failed: number; conflicts: number }> {
  const pending = listOutbox(opts.supportCallId).filter((i) => i.status === 'pending' || i.status === 'failed');
  let synced = 0;
  let failed = 0;
  let conflicts = 0;
  for (const item of pending) {
    updateOutbox(item.id, { status: 'syncing' });
    try {
      await opts.post(item.path, item.body, { 'Idempotency-Key': item.idempotencyKey });
      removeOutbox(item.id);
      synced += 1;
    } catch (e) {
      const status = (e as { status?: number })?.status;
      if (status === 409) {
        updateOutbox(item.id, { status: 'conflict', lastError: e instanceof Error ? e.message : 'Conflict' });
        conflicts += 1;
        if (opts.onConflict) await opts.onConflict(item, e);
      } else if (isNetworkError(e)) {
        updateOutbox(item.id, { status: 'pending', lastError: e instanceof Error ? e.message : 'Offline' });
        failed += 1;
        break; // stop flush while offline
      } else {
        updateOutbox(item.id, { status: 'failed', lastError: e instanceof Error ? e.message : String(e) });
        failed += 1;
      }
    }
  }
  return { synced, failed, conflicts };
}
