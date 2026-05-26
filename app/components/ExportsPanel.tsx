'use client';

import { useCallback, useMemo, useState } from 'react';

export type ExportType = 'all' | 'tickets' | 'new-sites' | 'travel-logs';

export interface ExportsPanelProps {
  isAdmin: boolean;
  onClose?: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
  getAuthHeaders: () => Promise<HeadersInit>;
  memberOptions?: { id: string; full_name: string }[];
  variant?: 'panel' | 'page';
}

type ExportOption = {
  type: ExportType;
  label: string;
  description: string;
  icon: string;
};

const QUICK_FILTERS = [
  {
    label: 'Last 7 Days',
    getRange: () => {
      const end = new Date();
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
    },
  },
  {
    label: 'Last 30 Days',
    getRange: () => {
      const end = new Date();
      const start = new Date(end);
      start.setDate(start.getDate() - 29);
      return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
    },
  },
  {
    label: 'This Month',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
    },
  },
  {
    label: 'This Year',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      return { start: start.toISOString().slice(0, 10), end: now.toISOString().slice(0, 10) };
    },
  },
];

const ADMIN_OPTIONS: ExportOption[] = [
  { type: 'all', label: 'All Data Export', description: 'Download a multi-sheet workbook covering the full admin dataset.', icon: '📊' },
  { type: 'tickets', label: 'Ticket Report', description: 'Export ticket operations, statuses, response times, and owners.', icon: '🎫' },
  { type: 'travel-logs', label: 'Travel Log Report', description: 'Export travel distance, destinations, and reimbursement data.', icon: '🚗' },
  { type: 'new-sites', label: 'Site Report', description: 'Export new-site project records and related rollout details.', icon: '🏗' },
];

const MEMBER_OPTIONS: ExportOption[] = [
  { type: 'all', label: 'All Data Export', description: 'Download your personal workbook across supported datasets.', icon: '📊' },
  { type: 'tickets', label: 'Ticket Report', description: 'Export your own ticket records and response data.', icon: '🎫' },
  { type: 'travel-logs', label: 'Travel Log Report', description: 'Export your own travel logs and reimbursement detail.', icon: '🚗' },
  { type: 'new-sites', label: 'Site Report', description: 'Export your assigned site rollout data.', icon: '🏗' },
];

export default function ExportsPanel({
  isAdmin,
  onClose,
  getAuthHeaders,
  memberOptions = [],
  variant = 'panel',
}: ExportsPanelProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(today);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [loading, setLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const options = useMemo(() => (isAdmin ? ADMIN_OPTIONS : MEMBER_OPTIONS), [isAdmin]);

  const triggerExport = useCallback(async (option: ExportOption) => {
    if (loading) return;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      setExportError('Start date must be before or equal to end date.');
      return;
    }

    setExportError(null);
    setToastMessage(`${option.label} started. Preparing your file...`);
    setLoading(true);

    try {
      const headers = await getAuthHeaders();
      let url = `/api/export?type=${encodeURIComponent(option.type)}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
      if (isAdmin && selectedMemberId) {
        url += `&memberId=${encodeURIComponent(selectedMemberId)}`;
      }

      const res = await fetch(url, { credentials: 'include', headers });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = data?.error || (res.status === 403 ? 'You do not have permission to export.' : 'Export failed. Please try again.');
        setExportError(message);
        setToastMessage(null);
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition');
      const match = disposition?.match(/filename="?([^";]+)"?/);
      const filename = match ? match[1].replace(/\\"/g, '"') : `KPI-Export-${startDate}_to_${endDate}.xlsx`;

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);

      setToastMessage(`${option.label} complete. ${filename} is ready.`);
      if (variant === 'panel') {
        onClose?.();
      }
    } catch {
      setExportError('Export failed. Please try again.');
      setToastMessage(null);
    } finally {
      setLoading(false);
      setTimeout(() => setToastMessage(null), 3000);
    }
  }, [endDate, getAuthHeaders, isAdmin, loading, onClose, selectedMemberId, startDate, variant]);

  const containerClassName = variant === 'page'
    ? 'relative w-full rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20'
    : 'absolute right-0 top-full z-50 mt-2 w-[420px] rounded-3xl border border-slate-700/70 bg-slate-900/95 p-4 shadow-2xl shadow-black/30';

  return (
    <div className={containerClassName}>
      {toastMessage && (
        <div className="mb-4 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-300">
          {toastMessage}
        </div>
      )}

      {exportError && (
        <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {exportError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1.6fr]">
        <div className="space-y-4">
          <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-sm font-medium text-white">Date filters</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs text-slate-500">Start date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  disabled={loading}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-slate-500">End date</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  disabled={loading}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white"
                />
              </label>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_FILTERS.map((filter) => (
                <button
                  key={filter.label}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    const { start, end } = filter.getRange();
                    setStartDate(start);
                    setEndDate(end);
                  }}
                  className="rounded-2xl bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </section>

          {isAdmin && memberOptions.length > 0 && (
            <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-sm font-medium text-white">Member filter</p>
              <p className="mt-1 text-xs text-slate-500">Optional: scope the export down to one team member.</p>
              <select
                value={selectedMemberId}
                onChange={(event) => setSelectedMemberId(event.target.value)}
                disabled={loading}
                className="mt-4 w-full rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white"
              >
                <option value="">All Members</option>
                {memberOptions.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name}
                  </option>
                ))}
              </select>
            </section>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {options.map((option) => (
            <button
              key={option.type}
              type="button"
              disabled={loading}
              onClick={() => void triggerExport(option)}
              className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5 text-left transition hover:border-blue-500/20 hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{option.icon}</span>
                <p className="text-base font-semibold text-white">{option.label}</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-500">{option.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
