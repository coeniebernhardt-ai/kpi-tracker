import type { Profile, Ticket, TravelLog } from '../lib/supabase';

export type DatePresetKey = '1d' | '7d' | '30d' | '90d' | '365d' | 'custom';
export type MetricFocus = 'total' | 'open' | 'pending' | 'closed' | 'avg-response';
export type LayoutMode = 'grid' | 'list';
export type TicketsTab = 'tickets' | 'travel-logs';
export type ImageTab = 'profile' | 'tickets' | 'travel-logs';
export type NotificationTab = 'created' | 'sent';

export type DateRangeState = {
  preset: DatePresetKey;
  startDate: string;
  endDate: string;
};

export type DashboardMetrics = {
  total: number;
  open: number;
  pending: number;
  closed: number;
  avgResponse: number | null;
};

export type TeamMemberSummary = {
  profile: Profile;
  ticketsHandled: number;
  openTickets: number;
  pendingTickets: number;
  closedTickets: number;
  avgResponse: number | null;
  distanceKm: number;
  fuelClaim: number;
  travelLogCount: number;
  lastActivity: string | null;
};

export type DashboardInsight = {
  title: string;
  value: string;
  detail: string;
};

export type DashboardAlert = {
  title: string;
  value: string;
  detail: string;
};

export type ChartPoint = {
  key?: string;
  label: string;
  created?: number;
  resolved?: number;
  value?: number;
};

export type DistributionDatum = {
  label: string;
  value: number;
  color?: string;
};

export const DATE_PRESETS: Array<{ key: DatePresetKey; label: string; days?: number }> = [
  { key: '1d', label: '1 day', days: 1 },
  { key: '7d', label: '7 days', days: 7 },
  { key: '30d', label: '30 days', days: 30 },
  { key: '90d', label: '90 days', days: 90 },
  { key: '365d', label: '365 days', days: 365 },
  { key: 'custom', label: 'Custom' },
];

const CLIENT_ORDER = ['Balwin', 'Redefine', 'Go City', 'Go Waterfall'];

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function getDatePresetRange(preset: Exclude<DatePresetKey, 'custom'>, now = new Date()): DateRangeState {
  const end = new Date(now);
  const presetConfig = DATE_PRESETS.find((item) => item.key === preset);
  const days = presetConfig?.days ?? 30;
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));
  return {
    preset,
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(end),
  };
}

export function getDateRangeFromSearchParams(searchParams: URLSearchParams, fallbackPreset: Exclude<DatePresetKey, 'custom'> = '7d'): DateRangeState {
  const presetValue = searchParams.get('preset') as DatePresetKey | null;
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (startDate && endDate) {
    return {
      preset: presetValue && DATE_PRESETS.some((item) => item.key === presetValue) ? presetValue : 'custom',
      startDate,
      endDate,
    };
  }

  return getDatePresetRange(fallbackPreset);
}

export function applyDateRangeToParams(current: URLSearchParams, range: DateRangeState) {
  const next = new URLSearchParams(current.toString());
  next.set('preset', range.preset);
  next.set('startDate', range.startDate);
  next.set('endDate', range.endDate);
  return next;
}

export function dateIsWithinRange(dateValue: string, range: DateRangeState) {
  const current = new Date(dateValue).getTime();
  const start = new Date(`${range.startDate}T00:00:00`).getTime();
  const end = new Date(`${range.endDate}T23:59:59`).getTime();
  return current >= start && current <= end;
}

export function filterTicketsByDateRange(tickets: Ticket[], range: DateRangeState) {
  return tickets.filter((ticket) => dateIsWithinRange(ticket.created_at, range));
}

export function filterTravelLogsByDateRange(travelLogs: TravelLog[], range: DateRangeState) {
  return travelLogs.filter((log) => dateIsWithinRange(log.created_at, range));
}

export function filterTicketsByMetricFocus(tickets: Ticket[], focus: MetricFocus) {
  if (focus === 'total' || focus === 'avg-response') return tickets;
  return tickets.filter((ticket) => ticket.status === focus);
}

export function formatMetricValue(value: number | null, suffix = '') {
  if (value == null || Number.isNaN(value)) return '—';
  return `${Math.round(value)}${suffix}`;
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatFuelClaim(distanceKm: number) {
  const claim = distanceKm * 5.8;
  return `${new Intl.NumberFormat('en-ZA').format(Number(distanceKm.toFixed(0)))} km • ${formatCurrency(claim)}`;
}

export function calculateDashboardMetrics(tickets: Ticket[]): DashboardMetrics {
  const total = tickets.length;
  const open = tickets.filter((ticket) => ticket.status === 'open').length;
  const pending = tickets.filter((ticket) => ticket.status === 'pending').length;
  const closed = tickets.filter((ticket) => ticket.status === 'closed').length;
  const responded = tickets.filter((ticket) => typeof ticket.response_time_minutes === 'number' && ticket.response_time_minutes > 0);
  const avgResponse = responded.length
    ? responded.reduce((sum, ticket) => sum + (ticket.response_time_minutes ?? 0), 0) / responded.length
    : null;

  return { total, open, pending, closed, avgResponse };
}

export function calculateTeamMemberSummaries(
  profiles: Profile[],
  tickets: Ticket[],
  travelLogs: TravelLog[],
): TeamMemberSummary[] {
  return profiles.map((profile) => {
    const memberTickets = tickets.filter((ticket) => ticket.user_id === profile.id);
    const memberTravelLogs = travelLogs.filter((log) => log.user_id === profile.id);
    const respondedTickets = memberTickets.filter((ticket) => typeof ticket.response_time_minutes === 'number' && ticket.response_time_minutes > 0);
    const lastActivitySource = [
      ...memberTickets.map((ticket) => ticket.created_at),
      ...memberTravelLogs.map((log) => log.created_at),
    ].sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
    const distanceKm = memberTravelLogs.reduce((sum, log) => sum + (log.distance_travelled ?? 0), 0);

    return {
      profile,
      ticketsHandled: memberTickets.length,
      openTickets: memberTickets.filter((ticket) => ticket.status === 'open').length,
      pendingTickets: memberTickets.filter((ticket) => ticket.status === 'pending').length,
      closedTickets: memberTickets.filter((ticket) => ticket.status === 'closed').length,
      avgResponse: respondedTickets.length
        ? respondedTickets.reduce((sum, ticket) => sum + (ticket.response_time_minutes ?? 0), 0) / respondedTickets.length
        : null,
      distanceKm,
      fuelClaim: distanceKm * 5.8,
      travelLogCount: memberTravelLogs.length,
      lastActivity: lastActivitySource,
    };
  });
}

export function getTopInsights(tickets: Ticket[], teamSummaries: TeamMemberSummary[]): DashboardInsight[] {
  const clientCounts = countBy(tickets, (ticket) => ticket.client || 'Unknown client');
  const estateCounts = countBy(tickets, (ticket) => ticket.estate_or_building || 'Unknown estate');
  const topClient = clientCounts[0];
  const topEstate = estateCounts[0];
  const mostActive = [...teamSummaries].sort((a, b) => b.ticketsHandled - a.ticketsHandled)[0];

  return [
    {
      title: 'Top client',
      value: topClient?.label ?? 'No data',
      detail: topClient ? `${topClient.value} tickets in range` : 'Nothing in the selected range yet',
    },
    {
      title: 'Top estate',
      value: topEstate?.label ?? 'No data',
      detail: topEstate ? `${topEstate.value} tickets created` : 'No estate data in this range',
    },
    {
      title: 'Most active user',
      value: mostActive?.profile.full_name ?? 'No data',
      detail: mostActive ? `${mostActive.ticketsHandled} tickets handled` : 'No user activity in this range',
    },
  ];
}

export function getDashboardAlerts(tickets: Ticket[]): DashboardAlert[] {
  const now = Date.now();
  const overdue = tickets.filter((ticket) => ticket.status !== 'closed' && now - new Date(ticket.created_at).getTime() > 48 * 60 * 60 * 1000);
  const stalled = tickets.filter((ticket) => ticket.status === 'open' && now - new Date(ticket.created_at).getTime() > 72 * 60 * 60 * 1000);
  const slaRisk = tickets.filter((ticket) => typeof ticket.response_time_minutes === 'number' && (ticket.response_time_minutes ?? 0) > 240);

  return [
    {
      title: 'Overdue tickets',
      value: String(overdue.length),
      detail: overdue.length ? 'Needs attention from the operations team' : 'No overdue tickets in this range',
    },
    {
      title: 'Response delays',
      value: slaRisk.length ? `${slaRisk.length}` : '0',
      detail: slaRisk.length ? 'Tickets breached the four-hour response threshold' : 'Response times are healthy',
    },
    {
      title: 'Stale open queue',
      value: String(stalled.length),
      detail: stalled.length ? 'Open tickets inactive for more than 72 hours' : 'No stale open tickets detected',
    },
  ];
}

function countBy<T>(items: T[], getLabel: (item: T) => string): DistributionDatum[] {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const label = getLabel(item);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function getRangeDays(startDate: string, endDate: string) {
  return Math.max(
    1,
    Math.round(
      (new Date(`${endDate}T00:00:00`).getTime() - new Date(`${startDate}T00:00:00`).getTime()) /
        (24 * 60 * 60 * 1000)
    ) + 1,
  );
}

function buildDateBuckets(range: DateRangeState) {
  const days = getRangeDays(range.startDate, range.endDate);
  const bucketMap = new Map<string, ChartPoint>();
  for (let index = 0; index < days; index += 1) {
    const current = new Date(`${range.startDate}T00:00:00`);
    current.setDate(current.getDate() + index);
    const label = toDateInputValue(current);
    bucketMap.set(label, {
      key: label,
      label: current.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' }),
      created: 0,
      resolved: 0,
      value: 0,
    });
  }
  return bucketMap;
}

export function buildCreatedResolvedSeries(tickets: Ticket[], range: DateRangeState): ChartPoint[] {
  const buckets = buildDateBuckets(range);
  tickets.forEach((ticket) => {
    const createdKey = toDateInputValue(new Date(ticket.created_at));
    if (buckets.has(createdKey)) {
      buckets.get(createdKey)!.created = (buckets.get(createdKey)!.created ?? 0) + 1;
    }
    if (ticket.closed_at) {
      const closedKey = toDateInputValue(new Date(ticket.closed_at));
      if (buckets.has(closedKey)) {
        buckets.get(closedKey)!.resolved = (buckets.get(closedKey)!.resolved ?? 0) + 1;
      }
    }
  });
  return [...buckets.values()];
}

export function buildAvgResponseSeries(tickets: Ticket[], range: DateRangeState): ChartPoint[] {
  const buckets = buildDateBuckets(range);
  const sums = new Map<string, { total: number; count: number }>();

  tickets.forEach((ticket) => {
    if (!ticket.closed_at || !ticket.response_time_minutes) return;
    const key = toDateInputValue(new Date(ticket.closed_at));
    if (!buckets.has(key)) return;
    const current = sums.get(key) ?? { total: 0, count: 0 };
    current.total += ticket.response_time_minutes;
    current.count += 1;
    sums.set(key, current);
  });

  return [...buckets.entries()].map(([key, bucket]) => {
    const current = sums.get(key);
    return {
      ...bucket,
      value: current ? current.total / current.count : 0,
    };
  });
}

export function getClientDistribution(tickets: Ticket[]): DistributionDatum[] {
  const baseMap = new Map(CLIENT_ORDER.map((client) => [client, 0]));
  const clientColors: Record<string, string> = {
    Balwin: '#facc15',
    Redefine: '#ef4444',
    'Go City': '#22c55e',
    'Go Waterfall': '#38bdf8',
    Unknown: '#a78bfa',
  };
  tickets.forEach((ticket) => {
    const key = ticket.client || 'Unknown';
    baseMap.set(key, (baseMap.get(key) ?? 0) + 1);
  });
  return [...baseMap.entries()].map(([label, value]) => ({ label, value, color: clientColors[label] ?? '#f97316' }));
}

export function getTeamDistribution(teamSummaries: TeamMemberSummary[]): DistributionDatum[] {
  const teamPalette = ['#38bdf8', '#22c55e', '#facc15', '#f97316', '#ef4444', '#a78bfa', '#14b8a6'];
  return teamSummaries
    .map((member, index) => ({ label: member.profile.full_name, value: member.ticketsHandled, color: teamPalette[index % teamPalette.length] }))
    .sort((a, b) => b.value - a.value);
}

export function getStatusDistribution(tickets: Ticket[]): DistributionDatum[] {
  return [
    { label: 'Open', value: tickets.filter((ticket) => ticket.status === 'open').length, color: '#38bdf8' },
    { label: 'Pending', value: tickets.filter((ticket) => ticket.status === 'pending').length, color: '#facc15' },
    { label: 'Closed', value: tickets.filter((ticket) => ticket.status === 'closed').length, color: '#22c55e' },
  ];
}

export function getPriorityDistribution(tickets: Ticket[]): DistributionDatum[] {
  const priorityColors: Record<string, string> = {
    LOW: '#22c55e',
    MEDIUM: '#facc15',
    HIGH: '#f97316',
    URGENT: '#ef4444',
  };

  return ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((severity) => ({
    label: severity,
    value: tickets.filter((ticket) => ticket.severity === severity).length,
    color: priorityColors[severity],
  }));
}

export function formatCompactDateTime(value: string | null) {
  if (!value) return 'No activity';
  return new Date(value).toLocaleDateString('en-ZA', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function extractRelatedTicketFromTravelLog(log: TravelLog, tickets: Ticket[]) {
  const source = `${log.reason} ${log.comments ?? ''}`;
  const numberMatch = source.match(/\b(?:PEND|[A-Z]{1,4})-\d{8}-\d{3}\b/i);
  if (numberMatch) {
    const normalized = numberMatch[0].toUpperCase();
    return tickets.find((ticket) => ticket.ticket_number.toUpperCase() === normalized) ?? null;
  }

  const displayMatch = source.match(/#(\d{1,6})\b/);
  if (displayMatch) {
    return tickets.find((ticket) => String((ticket as Ticket & { display_id?: number | null }).display_id ?? '') === displayMatch[1]) ?? null;
  }

  const lowerSource = source.toLowerCase();
  return (
    tickets.find(
      (ticket) =>
        ticket.issue.toLowerCase().includes(lowerSource.slice(0, 24)) ||
        (ticket.estate_or_building ?? '').toLowerCase().includes(lowerSource.slice(0, 24)),
    ) ?? null
  );
}
