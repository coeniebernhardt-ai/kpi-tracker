'use client';

import { useState, useCallback } from 'react';

export type ExportType = 'all' | 'tickets' | 'new-sites' | 'travel-logs';

export interface ExportsPanelProps {
  isAdmin: boolean;
  onClose?: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
  /** Callback to get auth headers (e.g. Bearer token) for fetch */
  getAuthHeaders: () => Promise<HeadersInit>;
  /** Admin only: list of members for "Filter by Member" dropdown */
  memberOptions?: { id: string; full_name: string }[];
  variant?: 'panel' | 'page';
}

const QUICK_FILTERS = [
  { label: 'Last 7 Days', getRange: () => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
  }},
  { label: 'Last 30 Days', getRange: () => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 29);
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
  }},
  { label: 'This Month', getRange: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
  }},
  { label: 'This Year', getRange: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date();
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
  }},
];

const ADMIN_OPTIONS: { type: ExportType; label: string; icon: string }[] = [
  { type: 'all', label: 'Export All (Multi-Sheet)', icon: '📊' },
  { type: 'tickets', label: 'Export Tickets', icon: '🔧' },
  { type: 'new-sites', label: 'Export New Sites', icon: '🏗' },
  { type: 'travel-logs', label: 'Export Travel Logs', icon: '🚗' },
];

const MEMBER_OPTIONS: { type: ExportType; label: string; icon: string }[] = [
  { type: 'all', label: 'Export My Data (Multi-Sheet)', icon: '📊' },
  { type: 'tickets', label: 'Export My Tickets', icon: '🔧' },
  { type: 'new-sites', label: 'Export My New Sites', icon: '🏗' },
  { type: 'travel-logs', label: 'Export My Travel Logs', icon: '🚗' },
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
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(today);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [loading, setLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const options = isAdmin ? ADMIN_OPTIONS : MEMBER_OPTIONS;

  const triggerExport = useCallback(async (type: ExportType) => {
    if (loading) return;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      setExportError('Start date must be before or equal to end date.');
      return;
    }
    const rangeDays = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    if (rangeDays > 365 * 2) {
      setExportError('Date range cannot exceed 2 years.');
      return;
    }
    setExportError(null);
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      let url = `/api/export?type=${encodeURIComponent(type)}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
      if (isAdmin && selectedMemberId) url += `&memberId=${encodeURIComponent(selectedMemberId)}`;
      const res = await fetch(url, { credentials: 'include', headers });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data?.error || (res.status === 403 ? 'You do not have permission to export.' : 'Export failed. Please try again.');
        setExportError(msg);
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition');
      const match = disposition?.match(/filename="?([^";]+)"?/);
      const filename = match ? match[1].replace(/\\"/g, '"') : `KPI-Export-${startDate}_to_${endDate}.xlsx`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
      if (variant === 'panel') {
        onClose?.();
      }
    } catch {
      setExportError('Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedMemberId, isAdmin, loading, getAuthHeaders, onClose, variant]);

  const containerClassName = variant === 'page'
    ? 'relative w-full overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900 shadow-2xl'
    : 'absolute right-0 top-full z-50 mt-2 flex max-h-[85vh] w-[420px] min-w-[420px] flex-col overflow-hidden rounded-xl border border-slate-600/50 bg-slate-800/95 shadow-xl shadow-black/20';

  return (
    <div className={containerClassName}>
      <div className="p-4 border-b border-slate-700/70 flex-shrink-0">
        <h3 className="text-sm font-semibold text-white">
          {variant === 'page' ? 'Reports' : 'Exports'}
        </h3>
      </div>

      <div className="overflow-y-auto flex-1">
        {/* Date Range */}
        <div className="p-4 border-b border-slate-700/70 space-y-3">
          <p className="text-xs font-medium text-slate-400">📅 Date Range</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm disabled:opacity-60"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_FILTERS.map((q) => (
              <button
                key={q.label}
                type="button"
                disabled={loading}
                onClick={() => {
                  const { start, end } = q.getRange();
                  setStartDate(start);
                  setEndDate(end);
                  setExportError(null);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-700/80 text-slate-300 text-xs hover:bg-slate-600 disabled:opacity-50"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {/* Member filter (Admin only) */}
        {isAdmin && memberOptions.length > 0 && (
          <div className="p-4 border-b border-slate-700/70 space-y-2">
            <p className="text-xs font-medium text-slate-400">👤 Filter by Member (Optional)</p>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm disabled:opacity-60"
            >
              <option value="">All Members</option>
              {memberOptions.map((m) => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Export Options */}
        <div className="p-4 space-y-2">
          <p className="text-xs font-medium text-slate-400">📦 Export Options</p>
          <div className="grid gap-1.5">
            {options.map((opt) => (
              <button
                key={opt.type}
                type="button"
                disabled={loading}
                onClick={() => triggerExport(opt.type)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg bg-slate-700/50 border border-slate-600/50 text-left text-sm text-white hover:bg-slate-600/50 hover:border-slate-500 disabled:opacity-60 disabled:pointer-events-none transition-colors"
              >
                <span className="text-lg">{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading overlay (inside panel, non-blocking for page) */}
      {loading && (
        <div className={`absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center p-6 ${variant === 'page' ? 'rounded-2xl' : 'rounded-b-xl'}`}>
          <div className="w-10 h-10 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-medium text-white text-center">Preparing your export...</p>
          <p className="text-xs text-slate-400 text-center mt-1">Please wait while we generate your report.</p>
        </div>
      )}

      {/* Error message (toast-like) */}
      {exportError && !loading && (
        <div className="px-4 pb-4">
          <div className="px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-sm">
            {exportError}
          </div>
        </div>
      )}
    </div>
  );
}
