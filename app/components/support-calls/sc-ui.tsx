'use client';

import type { ReactNode } from 'react';

/* Shared slate/cyan styling + helpers for the Support Calls module. */

export const inputCls =
  'w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition focus:border-cyan-500';
export const textareaCls = `${inputCls} min-h-[84px] resize-y`;
export const labelCls = 'mb-1 block text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500';
export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-950/30 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50';
export const btnGhost =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50';
export const btnDanger =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50';

export function Field({
  label,
  children,
  hint,
  className = '',
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className={labelCls}>{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-500">{hint}</span>}
    </label>
  );
}

type Tone = 'slate' | 'cyan' | 'blue' | 'emerald' | 'amber' | 'rose' | 'violet';
const toneCls: Record<Tone, string> = {
  slate: 'bg-slate-800 text-slate-300',
  cyan: 'bg-cyan-500/15 text-cyan-300',
  blue: 'bg-blue-500/20 text-blue-300',
  emerald: 'bg-emerald-500/15 text-emerald-300',
  amber: 'bg-amber-500/15 text-amber-300',
  rose: 'bg-rose-500/15 text-rose-300',
  violet: 'bg-violet-500/15 text-violet-300',
};

export function Badge({ tone = 'slate', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs ${toneCls[tone]}`}>{children}</span>;
}

export const STAGE_LABELS: Record<string, string> = {
  logged: 'Logged',
  awaiting_assignment: 'Awaiting assignment',
  awaiting_acknowledgement: 'Awaiting acknowledgement',
  in_progress: 'In progress',
  awaiting_dependency: 'Awaiting dependency',
  awaiting_quote_decision: 'Awaiting quote decision',
  contributions_pending: 'Technical work pending',
  contributions_in_review: 'Technical work in review',
  technical_pending: 'Technical work pending',
  technical_in_review: 'Technical work in review',
  job_card_pending: 'Job card pending',
  awaiting_signature: 'Awaiting signature',
  ready_for_finance: 'Ready for finance',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

export function stageTone(stage: string): Tone {
  switch (stage) {
    case 'awaiting_assignment':
    case 'awaiting_acknowledgement':
      return 'amber';
    case 'awaiting_dependency':
    case 'awaiting_quote_decision':
      return 'violet';
    case 'contributions_pending':
    case 'contributions_in_review':
    case 'technical_pending':
    case 'technical_in_review':
    case 'job_card_pending':
    case 'awaiting_signature':
      return 'blue';
    case 'ready_for_finance':
      return 'emerald';
    case 'closed':
      return 'slate';
    case 'cancelled':
      return 'rose';
    default:
      return 'cyan';
  }
}

export function priorityTone(priority: string): Tone {
  switch (priority) {
    case 'Critical':
      return 'rose';
    case 'High':
      return 'amber';
    case 'Low':
      return 'slate';
    default:
      return 'cyan';
  }
}

export function StageBadge({ stage }: { stage: string }) {
  return <Badge tone={stageTone(stage)}>{STAGE_LABELS[stage] || stage}</Badge>;
}

export function fmtDateTime(v: string | null | undefined): string {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' });
}

export function fmtDate(v: string | null | undefined): string {
  if (!v) return '—';
  const d = new Date(v.length === 10 ? `${v}T00:00:00` : v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-ZA', { dateStyle: 'medium' });
}

/** ISO → value for <input type="datetime-local"> (local time). */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local value → ISO (or null). */
export function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function nowLocalInput(): string {
  return toLocalInput(new Date().toISOString());
}

export function Notice({ tone, children }: { tone: 'error' | 'success' | 'info'; children: ReactNode }) {
  const cls =
    tone === 'error'
      ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
      : tone === 'success'
        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
        : 'border-cyan-500/20 bg-cyan-500/10 text-cyan-200';
  return <div className={`whitespace-pre-line rounded-xl border px-3 py-2 text-sm ${cls}`}>{children}</div>;
}

export function errorMessage(e: unknown): string {
  const err = e as { message?: string; data?: { blockers?: string[] } };
  const blockers = err?.data?.blockers;
  const base = err?.message || 'Something went wrong';
  return blockers?.length ? `${base}\n• ${blockers.join('\n• ')}` : base;
}
