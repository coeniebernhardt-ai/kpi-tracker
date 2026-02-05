/**
 * AI Insights – compute metrics from raw data (read-only).
 * Used only on the server; no mutations. All numbers are derived here so the AI never calculates.
 */

import type { ComputedMetrics, AIInsightsFilters } from './ai-insights-types';

// Minimal shapes for server-side use (no need to import full Ticket/TravelLog)
interface TicketRow {
  status: string;
  created_at: string;
  closed_at?: string | null;
  response_time_minutes?: number | null;
  has_dependencies?: boolean | null;
  ticket_type?: string | null;
  client?: string | null;
}

interface TravelRow {
  end_address?: string | null;
  start_address?: string | null;
  distance_travelled?: number | null;
}

function applyFilters<T extends { created_at: string; user_id?: string }>(
  items: T[],
  filters?: AIInsightsFilters
): T[] {
  if (!filters) return items;
  let out = items;
  if (filters.dateFrom) {
    const from = new Date(filters.dateFrom).getTime();
    out = out.filter((t) => new Date(t.created_at).getTime() >= from);
  }
  if (filters.dateTo) {
    const to = new Date(filters.dateTo).setHours(23, 59, 59, 999);
    out = out.filter((t) => new Date(t.created_at).getTime() <= to);
  }
  if (filters.userId) {
    out = out.filter((t) => (t as any).user_id === filters.userId);
  }
  return out;
}

/** Compute all metrics from ticket and travel arrays. Pure function, read-only. */
export function computeMetrics(
  tickets: TicketRow[],
  travelLogs: TravelRow[],
  filters?: AIInsightsFilters
): ComputedMetrics {
  const filteredTickets = applyFilters(
    tickets as any[],
    filters
  ) as TicketRow[];
  const filteredTravel = applyFilters(
    travelLogs as any[],
    filters
  ) as TravelRow[];

  const totalTickets = filteredTickets.length;
  const openTickets = filteredTickets.filter((t) => t.status === 'open').length;
  const closedTickets = filteredTickets.filter((t) => t.status === 'closed').length;
  const closedRatePercent =
    totalTickets > 0 ? Math.round((closedTickets / totalTickets) * 1000) / 10 : 0;

  const withResponse = filteredTickets.filter(
    (t) => t.status === 'closed' && t.response_time_minutes != null && t.response_time_minutes > 0
  );
  const avgResponseTimeMinutes =
    withResponse.length > 0
      ? Math.round(
          withResponse.reduce((s, t) => s + (t.response_time_minutes ?? 0), 0) /
            withResponse.length
        )
      : 0;

  const withClosedAt = filteredTickets.filter(
    (t) => t.status === 'closed' && t.closed_at && t.created_at
  );
  const resolutionTimes = withClosedAt.map((t) => {
    const created = new Date(t.created_at).getTime();
    const closed = new Date(t.closed_at!).getTime();
    return (closed - created) / (1000 * 60);
  });
  const avgResolutionTimeMinutes =
    resolutionTimes.length > 0
      ? Math.round(
          resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
        )
      : 0;

  const withDeps = filteredTickets.filter((t) => t.has_dependencies === true);
  const ticketsWithDependencies = withDeps.length;
  const ticketsWithDependenciesPercent =
    totalTickets > 0
      ? Math.round((ticketsWithDependencies / totalTickets) * 1000) / 10
      : 0;

  const now = Date.now();
  const h24 = 24 * 60 * 60 * 1000;
  const h72 = 72 * 60 * 60 * 1000;
  const openTix = filteredTickets.filter((t) => t.status === 'open');
  const openOlderThan24h = openTix.filter(
    (t) => now - new Date(t.created_at).getTime() > h24
  ).length;
  const openOlderThan72h = openTix.filter(
    (t) => now - new Date(t.created_at).getTime() > h72
  ).length;

  const byType: { type: string; count: number }[] = [];
  const typeCount: Record<string, number> = {};
  filteredTickets.forEach((t) => {
    const type = t.ticket_type || 'Unknown';
    typeCount[type] = (typeCount[type] || 0) + 1;
  });
  Object.entries(typeCount).forEach(([type, count]) =>
    byType.push({ type, count })
  );

  const byClient: { client: string; count: number }[] = [];
  const clientCount: Record<string, number> = {};
  filteredTickets.forEach((t) => {
    const client = t.client || 'Unknown';
    clientCount[client] = (clientCount[client] || 0) + 1;
  });
  Object.entries(clientCount).forEach(([client, count]) =>
    byClient.push({ client, count })
  );

  const totalTravelLogs = filteredTravel.length;
  const locationCount: Record<string, number> = {};
  filteredTravel.forEach((t) => {
    const loc =
      (t.end_address || t.start_address || 'Unknown').trim() || 'Unknown';
    locationCount[loc] = (locationCount[loc] || 0) + 1;
  });
  const travelFrequencyByLocation = Object.entries(locationCount).map(
    ([location, count]) => ({ location, count })
  );
  const totalDistanceKm =
    Math.round(
      (filteredTravel.reduce((s, t) => s + (t.distance_travelled ?? 0), 0) *
        10) / 10
  ) || 0;

  return {
    totalTickets,
    openTickets,
    closedTickets,
    closedRatePercent,
    avgResponseTimeMinutes,
    avgResolutionTimeMinutes,
    ticketsWithDependencies,
    ticketsWithDependenciesPercent,
    openOlderThan24h,
    openOlderThan72h,
    byType,
    byClient,
    totalTravelLogs,
    travelFrequencyByLocation,
    totalDistanceKm,
  };
}
