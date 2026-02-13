/**
 * Think-Q – compute universal analytics snapshot from live data (read-only).
 * Single source of truth for AI and CSV export. No mutations.
 */

import type {
  ComputedMetrics,
  AIInsightsFilters,
  UniversalAnalyticsSnapshot,
} from './ai-insights-types';
import type { TicketRowForAnalytics, TravelRowForAnalytics, ProfileRowForAnalytics } from '@/app/lib/supabase';
import { classifyIssueNature } from './ai-insights-issue-nature';

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
    out = out.filter((t) => (t as { user_id?: string }).user_id === filters.userId);
  }
  return out;
}

function toDateKey(iso: string): string {
  return iso.slice(0, 10);
}
function toWeekKey(iso: string): string {
  const d = new Date(iso);
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay() + 1);
  const y = start.getFullYear();
  const w = Math.ceil((start.getTime() - new Date(y, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${y}-W${String(w).padStart(2, '0')}`;
}
function toMonthKey(iso: string): string {
  return iso.slice(0, 7);
}

/**
 * Build the universal analytics snapshot from ALL live datasets. READ-ONLY. Data-driven: every categorical and time dimension aggregated.
 */
export function computeUniversalSnapshot(
  tickets: TicketRowForAnalytics[],
  travelLogs: TravelRowForAnalytics[],
  profiles: ProfileRowForAnalytics[],
  filters: AIInsightsFilters,
  generatedAt: string
): UniversalAnalyticsSnapshot {
  const filteredTickets = applyFilters(tickets, filters);
  const filteredTravel = applyFilters(travelLogs, filters);
  // Profiles: no user/date filter in current filters; use all for full visibility
  const filteredProfiles = profiles;

  const profileDisplayNames: Record<string, string> = {};
  profiles.forEach((p) => {
    profileDisplayNames[p.id] = p.full_name ?? p.id;
  });

  const countBy = <T>(items: T[], keyFn: (t: T) => string): { key: string; count: number }[] => {
    const m: Record<string, number> = {};
    items.forEach((t) => {
      const k = keyFn(t);
      m[k] = (m[k] || 0) + 1;
    });
    return Object.entries(m).map(([key, count]) => ({ key, count }));
  };

  // --- PROFILES ---
  const totalProfiles = filteredProfiles.length;
  const profilesByRole = countBy(filteredProfiles, (p) => p.role ?? 'Unknown').map(({ key, count }) => ({ role: key, count }));
  const profilesByIsAdmin = countBy(filteredProfiles, (p) => p.is_admin === true ? 'true' : 'false').map(({ key, count }) => ({ isAdmin: key, count }));
  const profilesByIsActive = countBy(filteredProfiles, (p) => p.is_active === true ? 'true' : 'false').map(({ key, count }) => ({ isActive: key, count }));
  const profilesByDay = (p: ProfileRowForAnalytics) => p.created_at ? toDateKey(p.created_at) : 'Unknown';
  const profilesByWeek = (p: ProfileRowForAnalytics) => p.created_at ? toWeekKey(p.created_at) : 'Unknown';
  const profilesByMonth = (p: ProfileRowForAnalytics) => p.created_at ? toMonthKey(p.created_at) : 'Unknown';
  const profByDay = countBy(filteredProfiles, profilesByDay).map(({ key, count }) => ({ date: key, count }));
  const profByWeek = countBy(filteredProfiles, profilesByWeek).map(({ key, count }) => ({ week: key, count }));
  const profByMonth = countBy(filteredProfiles, profilesByMonth).map(({ key, count }) => ({ month: key, count }));

  // --- TICKETS ---
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
          withResponse.reduce((s, t) => s + (t.response_time_minutes ?? 0), 0) / withResponse.length
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
      ? Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length)
      : 0;

  const ticketsWithDependencies = filteredTickets.filter((t) => t.has_dependencies === true).length;
  const ticketsWithDependenciesPercent =
    totalTickets > 0
      ? Math.round((ticketsWithDependencies / totalTickets) * 1000) / 10
      : 0;

  const now = Date.now();
  const h24 = 24 * 60 * 60 * 1000;
  const h72 = 72 * 60 * 60 * 1000;
  const openTix = filteredTickets.filter((t) => t.status === 'open');
  const openOlderThan24h = openTix.filter((t) => now - new Date(t.created_at).getTime() > h24).length;
  const openOlderThan72h = openTix.filter((t) => now - new Date(t.created_at).getTime() > h72).length;

  const ticketsByClient = countBy(filteredTickets, (t) => t.client || 'Unknown').map(({ key, count }) => ({ client: key, count }));
  const ticketsByEstate = countBy(filteredTickets, (t) => {
    const e = t.estate_or_building || t.cml_location;
    return (e && String(e).trim()) || 'Unknown';
  }).map(({ key, count }) => ({ estate: key, count }));
  const ticketsByStatus = countBy(filteredTickets, (t) => t.status).map(({ key, count }) => ({ status: key, count }));
  const ticketsByType = countBy(filteredTickets, (t) => t.ticket_type || 'Unknown').map(({ key, count }) => ({ type: key, count }));
  const ticketsByLocation = countBy(filteredTickets, (t) => t.location || 'Unknown').map(({ key, count }) => ({ location: key, count }));
  const ticketsBySeverity = countBy(filteredTickets, (t) => t.severity || 'Unknown').map(({ key, count }) => ({ severity: key, count }));
  const ticketsByCreator = countBy(filteredTickets, (t) => t.user_id).map(({ key, count }) => ({ userId: key, count }));
  const ticketsByCreatedBy = countBy(filteredTickets, (t) => t.created_by ?? 'Unset').map(({ key, count }) => ({ userId: key, count }));
  const ticketsByDependencyName = countBy(filteredTickets, (t) => (t.dependency_name && String(t.dependency_name).trim()) || 'None').map(({ key, count }) => ({ dependencyName: key, count }));

  // Derived from issue/resolution text via fixed taxonomy (read-only; no write back to tickets)
  const ticketsByIssueNature = countBy(filteredTickets, (t) => classifyIssueNature(t.issue, t.resolution)).map(({ key, count }) => ({ issueNature: key, count }));

  const assignedCount: Record<string, number> = {};
  filteredTickets.forEach((t) => {
    const ids = t.assigned_to_array && Array.isArray(t.assigned_to_array) ? t.assigned_to_array : [];
    ids.forEach((id) => {
      if (id) assignedCount[id] = (assignedCount[id] || 0) + 1;
    });
  });
  const ticketsByAssignedUser = Object.entries(assignedCount).map(([userId, count]) => ({ userId, count }));

  const ticketsByDay = countBy(filteredTickets, (t) => toDateKey(t.created_at)).map(({ key, count }) => ({ date: key, count }));
  const ticketsByWeek = countBy(filteredTickets, (t) => toWeekKey(t.created_at)).map(({ key, count }) => ({ week: key, count }));
  const ticketsByMonth = countBy(filteredTickets, (t) => toMonthKey(t.created_at)).map(({ key, count }) => ({ month: key, count }));

  // --- TRAVEL ---
  const totalTravelLogs = filteredTravel.length;
  const totalDistanceKm =
    Math.round(
      filteredTravel.reduce((s, t) => s + (t.distance_travelled ?? 0), 0) * 10
    ) / 10 || 0;

  const travelByLocation = countBy(filteredTravel, (t) =>
    (t.end_address || t.start_address || 'Unknown').trim() || 'Unknown'
  ).map(({ key, count }) => ({ location: key, count }));
  const travelByUser = countBy(filteredTravel, (t) => t.user_id).map(({ key, count }) => ({ userId: key, count }));
  const travelByReason = countBy(filteredTravel, (t) => (t.reason && String(t.reason).trim()) || 'Unknown').map(({ key, count }) => ({ reason: key, count }));
  const travelByIsReturnTrip = countBy(filteredTravel, (t) => t.is_return_trip === true ? 'true' : 'false').map(({ key, count }) => ({ isReturnTrip: key, count }));
  const travelByDate = countBy(filteredTravel, (t) => toDateKey(t.created_at)).map(({ key, count }) => ({ date: key, count }));
  const travelByWeek = countBy(filteredTravel, (t) => toWeekKey(t.created_at)).map(({ key, count }) => ({ week: key, count }));
  const travelByMonth = countBy(filteredTravel, (t) => toMonthKey(t.created_at)).map(({ key, count }) => ({ month: key, count }));

  const travelDistanceByUser: { userId: string; totalDistanceKm: number }[] = [];
  const distByUser: Record<string, number> = {};
  filteredTravel.forEach((t) => {
    const d = t.distance_travelled ?? 0;
    distByUser[t.user_id] = (distByUser[t.user_id] || 0) + d;
  });
  Object.entries(distByUser).forEach(([userId, totalDistanceKm]) => {
    travelDistanceByUser.push({ userId, totalDistanceKm: Math.round(totalDistanceKm * 10) / 10 });
  });

  return {
    generatedAt,
    filters,
    profileDisplayNames,
    totalProfiles,
    profilesByRole,
    profilesByIsAdmin,
    profilesByIsActive,
    profilesByDay: profByDay,
    profilesByWeek: profByWeek,
    profilesByMonth: profByMonth,
    totalTickets,
    totalTravelLogs,
    totalDistanceKm,
    openTickets,
    closedTickets,
    closedRatePercent,
    avgResponseTimeMinutes,
    avgResolutionTimeMinutes,
    ticketsWithDependencies,
    ticketsWithDependenciesPercent,
    openOlderThan24h,
    openOlderThan72h,
    ticketsByClient,
    ticketsByEstate,
    ticketsByStatus,
    ticketsByType,
    ticketsByLocation,
    ticketsBySeverity,
    ticketsByCreator,
    ticketsByCreatedBy,
    ticketsByAssignedUser,
    ticketsByDependencyName,
    ticketsByIssueNature,
    ticketsByDay,
    ticketsByWeek,
    ticketsByMonth,
    travelByLocation,
    travelByUser,
    travelByReason,
    travelByIsReturnTrip,
    travelByDate,
    travelByWeek,
    travelByMonth,
    travelDistanceByUser,
  };
}

/** Derive legacy ComputedMetrics from snapshot (for existing UI/export). */
export function snapshotToLegacyMetrics(snapshot: UniversalAnalyticsSnapshot): ComputedMetrics {
  return {
    totalTickets: snapshot.totalTickets,
    openTickets: snapshot.openTickets,
    closedTickets: snapshot.closedTickets,
    closedRatePercent: snapshot.closedRatePercent,
    avgResponseTimeMinutes: snapshot.avgResponseTimeMinutes,
    avgResolutionTimeMinutes: snapshot.avgResolutionTimeMinutes,
    ticketsWithDependencies: snapshot.ticketsWithDependencies,
    ticketsWithDependenciesPercent: snapshot.ticketsWithDependenciesPercent,
    openOlderThan24h: snapshot.openOlderThan24h,
    openOlderThan72h: snapshot.openOlderThan72h,
    byType: snapshot.ticketsByType,
    byClient: snapshot.ticketsByClient,
    totalTravelLogs: snapshot.totalTravelLogs,
    travelFrequencyByLocation: snapshot.travelByLocation,
    totalDistanceKm: snapshot.totalDistanceKm,
  };
}
