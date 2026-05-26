'use client';

import { useRef } from 'react';
import { CalendarRange } from 'lucide-react';
import type { ReactNode } from 'react';
import type {
  ChartPoint,
  DatePresetKey,
  DateRangeState,
  DistributionDatum,
  MetricFocus,
} from './admin-utils';
import { DATE_PRESETS } from './admin-utils';

export type AdminNavKey =
  | 'dashboard'
  | 'tickets'
  | 'callouts'
  | 'team'
  | 'images'
  | 'reports'
  | 'manage-users'
  | 'notifications'
  | 'sign-out';

export type AdminNavItem = {
  key: AdminNavKey;
  label: string;
  href?: string;
  emoji: string;
  adminOnly?: boolean;
  action?: 'sign-out';
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/admin', emoji: '🏠' },
  { key: 'tickets', label: 'Tickets', href: '/admin/tickets', emoji: '🎫' },
  { key: 'callouts', label: 'Callouts', href: '/admin/callouts', emoji: '📋' },
  { key: 'team', label: 'Team', href: '/admin/team', emoji: '👥' },
  { key: 'images', label: 'Images', href: '/admin/images', emoji: '🖼️' },
  { key: 'reports', label: 'Reports', href: '/admin/reports', emoji: '📊' },
  { key: 'manage-users', label: 'Manage Users', href: '/admin/manage-users', emoji: '🛡️' },
  { key: 'notifications', label: 'Notifications', href: '/admin/notifications', emoji: '🔔' },
  { key: 'sign-out', label: 'Sign Out', emoji: '👋', action: 'sign-out' },
];

export function getAdminActiveKey(pathname: string): AdminNavKey {
  if (pathname === '/admin/tickets') return 'tickets';
  if (pathname.startsWith('/admin/callouts')) return 'callouts';
  if (pathname === '/admin/team') return 'team';
  if (pathname === '/admin/images') return 'images';
  if (pathname === '/admin/reports') return 'reports';
  if (pathname === '/admin/manage-users') return 'manage-users';
  if (pathname === '/admin/notifications') return 'notifications';
  return 'dashboard';
}

type AdminDateControlsProps = {
  range: DateRangeState;
  onPresetChange: (preset: Exclude<DatePresetKey, 'custom'>) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  compact?: boolean;
};

export function AdminDateControls({
  range,
  onPresetChange,
  onStartDateChange,
  onEndDateChange,
  compact = false,
}: AdminDateControlsProps) {
  const startInputRef = useRef<HTMLInputElement | null>(null);
  const endInputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = (input: HTMLInputElement | null) => {
    if (!input) return;
    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }
    input.focus();
    input.click();
  };

  const formatDateLabel = (value: string) =>
    new Date(`${value}T00:00:00`).toLocaleDateString('en-ZA', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  return (
    <section className={`rounded-2xl border border-slate-800 bg-slate-900/70 ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
            <CalendarRange className="h-3.5 w-3.5 text-cyan-400" />
            Date range
          </div>

          <div className="flex flex-wrap gap-2">
            {DATE_PRESETS.filter((preset) => preset.key !== 'custom').map((preset) => {
              const isActive = range.preset === preset.key;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => onPresetChange(preset.key as Exclude<DatePresetKey, 'custom'>)}
                  className={`rounded-xl px-3 py-1.5 text-[11px] font-medium transition ${
                    isActive
                      ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className={`grid gap-2 ${compact ? 'sm:grid-cols-2' : 'md:max-w-[360px] md:grid-cols-2'}`}>
          <label className="block">
            <span className="mb-1 block text-[11px] uppercase tracking-[0.16em] text-slate-500">From</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => openPicker(startInputRef.current)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-left text-sm text-white outline-none transition hover:border-cyan-500/50"
              >
                <span>{formatDateLabel(range.startDate)}</span>
                <CalendarRange className="h-4 w-4 text-cyan-400" />
              </button>
              <input
                ref={startInputRef}
                type="date"
                value={range.startDate}
                onChange={(event) => onStartDateChange(event.target.value)}
                className="pointer-events-none absolute inset-0 h-0 w-0 opacity-0"
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] uppercase tracking-[0.16em] text-slate-500">To</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => openPicker(endInputRef.current)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-left text-sm text-white outline-none transition hover:border-cyan-500/50"
              >
                <span>{formatDateLabel(range.endDate)}</span>
                <CalendarRange className="h-4 w-4 text-cyan-400" />
              </button>
              <input
                ref={endInputRef}
                type="date"
                value={range.endDate}
                onChange={(event) => onEndDateChange(event.target.value)}
                className="pointer-events-none absolute inset-0 h-0 w-0 opacity-0"
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>
          </label>
        </div>
      </div>
    </section>
  );
}

type MetricCardProps = {
  title: string;
  value: string | number;
  detail: string;
  active?: boolean;
  emphasis?: 'primary' | 'secondary';
  onClick?: () => void;
};

export function MetricCard({
  title,
  value,
  detail,
  active = false,
  emphasis = 'secondary',
  onClick,
}: MetricCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-3xl border p-5 text-left transition ${
        active
          ? 'border-blue-500/40 bg-blue-500/15 shadow-lg shadow-blue-950/40'
          : emphasis === 'primary'
            ? 'border-slate-800 bg-slate-900/85 hover:border-blue-500/20 hover:bg-slate-900'
            : 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-900/75'
      }`}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <p className={`mt-4 text-3xl font-semibold ${active || emphasis === 'primary' ? 'text-white' : 'text-slate-200'}`}>{value}</p>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </button>
  );
}

type SegmentedControlProps<T extends string> = {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({ value, options, onChange }: SegmentedControlProps<T>) {
  return (
    <div className="inline-flex flex-wrap gap-2 rounded-3xl border border-slate-800 bg-slate-900/80 p-2">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
              active ? 'bg-blue-500/20 text-blue-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

type PanelProps = {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  accent?: 'default' | 'strong';
};

export function AdminPanel({ title, action, children, accent = 'default' }: PanelProps) {
  return (
    <section
      className={`rounded-3xl border p-5 ${
        accent === 'strong'
          ? 'border-blue-500/20 bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-950 shadow-lg shadow-blue-950/30'
          : 'border-slate-800 bg-slate-900/80'
      }`}
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

type LineChartProps = {
  data: ChartPoint[];
  mode: 'dual' | 'single';
  onPointClick?: (point: ChartPoint) => void;
  primaryColor?: string;
  secondaryColor?: string;
};

export function MiniLineChart({
  data,
  mode,
  onPointClick,
  primaryColor = mode === 'dual' ? '#facc15' : '#f97316',
  secondaryColor = '#22c55e',
}: LineChartProps) {
  if (data.length === 0) {
    return <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-10 text-center text-sm text-slate-500">No chart data in the selected range.</div>;
  }

  const width = 700;
  const height = 240;
  const inset = 24;
  const xStep = data.length > 1 ? (width - inset * 2) / (data.length - 1) : 0;
  const values =
    mode === 'dual'
      ? data.flatMap((point) => [point.created ?? 0, point.resolved ?? 0])
      : data.map((point) => point.value ?? 0);
  const max = Math.max(...values, 1);

  const getPointY = (value: number) => height - inset - (value / max) * (height - inset * 2);
  const getPointX = (index: number) => inset + index * xStep;
  const lineToPath = (source: number[]) =>
    source
      .map((value, index) => `${index === 0 ? 'M' : 'L'} ${getPointX(index)} ${getPointY(value)}`)
      .join(' ');

  const primaryValues = mode === 'dual' ? data.map((point) => point.created ?? 0) : data.map((point) => point.value ?? 0);
  const secondaryValues = data.map((point) => point.resolved ?? 0);

  return (
    <div className="space-y-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full overflow-visible">
        {[0, 1, 2, 3].map((index) => {
          const y = inset + ((height - inset * 2) / 3) * index;
          return <line key={index} x1={inset} x2={width - inset} y1={y} y2={y} className="stroke-slate-800" strokeWidth="1" />;
        })}

        {mode === 'dual' && (
          <path d={lineToPath(secondaryValues)} fill="none" stroke={secondaryColor} strokeWidth="3" strokeLinecap="round" />
        )}
        <path d={lineToPath(primaryValues)} fill="none" stroke={primaryColor} strokeWidth="3" strokeLinecap="round" />

        {data.map((point, index) => {
          const x = getPointX(index);
          const primaryY = getPointY(primaryValues[index] ?? 0);
          const secondaryY = getPointY(secondaryValues[index] ?? 0);
          return (
            <g key={`${point.label}-${index}`}>
              <circle cx={x} cy={primaryY} r="5" fill={primaryColor} className={onPointClick ? 'cursor-pointer' : ''} onClick={() => onPointClick?.(point)}>
                <title>{mode === 'dual' ? `${point.label}: ${point.created ?? 0} created` : `${point.label}: ${Math.round(point.value ?? 0)} min`}</title>
              </circle>
              {mode === 'dual' && (
                <circle cx={x} cy={secondaryY} r="5" fill={secondaryColor} className={onPointClick ? 'cursor-pointer' : ''} onClick={() => onPointClick?.(point)}>
                  <title>{`${point.label}: ${point.resolved ?? 0} resolved`}</title>
                </circle>
              )}
            </g>
          );
        })}
      </svg>

      <div className="grid grid-cols-2 gap-3 text-xs text-slate-500 md:grid-cols-4">
        {data.slice(Math.max(0, data.length - 4)).map((point) => (
          <button key={point.label} type="button" onClick={() => onPointClick?.(point)} className="rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-left hover:border-blue-500/20 hover:text-white">
            <p>{point.label}</p>
            <p className="mt-1 text-sm font-medium text-slate-300">
              {mode === 'dual' ? `${point.created ?? 0} / ${point.resolved ?? 0}` : `${Math.round(point.value ?? 0)} min`}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

type BarChartProps = {
  data: DistributionDatum[];
  onBarClick?: (label: string) => void;
};

const VIVID_CHART_COLORS = ['#38bdf8', '#22c55e', '#facc15', '#f97316', '#ef4444', '#a78bfa', '#14b8a6'];

export function MiniBarChart({ data, onBarClick }: BarChartProps) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <button
          key={item.label}
          type="button"
          onClick={() => onBarClick?.(item.label)}
          title={`${item.label}: ${item.value}`}
          className="flex w-full items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3 text-left transition hover:border-blue-500/20"
        >
          <div className="w-28 shrink-0 text-sm text-slate-300">{item.label}</div>
          <div className="h-3 flex-1 rounded-full bg-slate-800">
            <div
              className="h-3 rounded-full"
              aria-hidden="true"
              style={{
                width: `${Math.max(8, (item.value / max) * 100)}%`,
                background: `linear-gradient(90deg, ${item.color ?? VIVID_CHART_COLORS[index % VIVID_CHART_COLORS.length]}, rgba(255,255,255,0.92))`,
              }}
            />
          </div>
          <div className="w-10 shrink-0 text-right text-sm font-medium text-white">{item.value}</div>
        </button>
      ))}
    </div>
  );
}

type DonutChartProps = {
  data: DistributionDatum[];
  onSliceClick?: (label: string) => void;
};

export function MiniDonutChart({ data, onSliceClick }: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (!total) {
    return <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-10 text-center text-sm text-slate-500">No distribution data available.</div>;
  }

  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  let running = 0;

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
      <svg viewBox="0 0 160 160" className="mx-auto h-40 w-40">
        <g transform="translate(80 80)">
          {data.map((item, index) => {
            const portion = item.value / total;
            const length = portion * circumference;
            const offset = -running;
            running += length;
            return (
              <circle
                key={item.label}
                r={radius}
                cx="0"
                cy="0"
                fill="none"
                stroke={item.color ?? VIVID_CHART_COLORS[index % VIVID_CHART_COLORS.length]}
                strokeWidth="20"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={offset}
                transform="rotate(-90)"
                className={onSliceClick ? 'cursor-pointer' : ''}
                onClick={() => onSliceClick?.(item.label)}
              >
                <title>{`${item.label}: ${item.value}`}</title>
              </circle>
            );
          })}
          <circle r="38" fill="#0f172a" />
          <text x="0" y="-2" textAnchor="middle" className="fill-white text-[20px] font-semibold">
            {total}
          </text>
          <text x="0" y="16" textAnchor="middle" className="fill-slate-500 text-[10px] uppercase tracking-[0.18em]">
            Total
          </text>
        </g>
      </svg>

      <div className="flex-1 space-y-2">
        {data.map((item, index) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onSliceClick?.(item.label)}
            title={`${item.label}: ${item.value}`}
            className="flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-left transition hover:border-blue-500/20"
          >
            <span className="flex items-center gap-2 text-sm text-slate-300">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color ?? VIVID_CHART_COLORS[index % VIVID_CHART_COLORS.length] }} />
              {item.label}
            </span>
            <span className="text-sm font-medium text-white">{item.value}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/70 px-6 py-12 text-center">
      <p className="text-base font-medium text-white">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export function getMetricCardAccent(metric: MetricFocus) {
  if (metric === 'total' || metric === 'open' || metric === 'pending') return 'primary';
  return 'secondary';
}
