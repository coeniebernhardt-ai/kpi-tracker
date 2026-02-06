/**
 * AI Insights – shared types for metrics and API.
 * Universal snapshot is the single source for AI and CSV export.
 */

export interface AIInsightsFilters {
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
}

/** Pre-computed metrics (legacy summary view; derived from UniversalAnalyticsSnapshot). */
export interface ComputedMetrics {
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
  closedRatePercent: number;
  avgResponseTimeMinutes: number;
  avgResolutionTimeMinutes: number;
  ticketsWithDependencies: number;
  ticketsWithDependenciesPercent: number;
  openOlderThan24h: number;
  openOlderThan72h: number;
  byType: { type: string; count: number }[];
  byClient: { client: string; count: number }[];
  totalTravelLogs: number;
  travelFrequencyByLocation: { location: string; count: number }[];
  totalDistanceKm: number;
}

/**
 * Universal analytics snapshot – ALL dimensions from live data.
 * Used by AI (only this is passed) and by full CSV export.
 * Enables percentages, comparisons, and trends without new backend code.
 */
export interface UniversalAnalyticsSnapshot {
  /** When computed and which filters were applied (for CSV header). */
  generatedAt: string;
  filters: AIInsightsFilters;
  /** User id -> display name for labels in export/AI. */
  profileDisplayNames: Record<string, string>;
  /** Totals. */
  totalTickets: number;
  totalTravelLogs: number;
  totalDistanceKm: number;
  /** Ticket summary (for quick answers). */
  openTickets: number;
  closedTickets: number;
  closedRatePercent: number;
  avgResponseTimeMinutes: number;
  avgResolutionTimeMinutes: number;
  ticketsWithDependencies: number;
  ticketsWithDependenciesPercent: number;
  openOlderThan24h: number;
  openOlderThan72h: number;
  /** Tickets by dimension (every bucket needed for pivots and comparisons). */
  ticketsByClient: { client: string; count: number }[];
  ticketsByEstate: { estate: string; count: number }[];
  ticketsByStatus: { status: string; count: number }[];
  ticketsByType: { type: string; count: number }[];
  ticketsByLocation: { location: string; count: number }[];
  ticketsByCreator: { userId: string; count: number }[];
  ticketsByAssignedUser: { userId: string; count: number }[];
  ticketsByDay: { date: string; count: number }[];
  ticketsByWeek: { week: string; count: number }[];
  ticketsByMonth: { month: string; count: number }[];
  /** Travel by dimension. */
  travelByLocation: { location: string; count: number }[];
  travelByUser: { userId: string; count: number }[];
  travelByDate: { date: string; count: number }[];
  travelDistanceByUser: { userId: string; totalDistanceKm: number }[];
}

export interface AIInsightsRequest {
  question: string;
  filters?: AIInsightsFilters;
  /** Optional: pass session token when cookies are not sent (e.g. preview deployment) */
  accessToken?: string;
}

export interface AIInsightsResponse {
  question: string;
  filters: AIInsightsFilters;
  /** Full snapshot (what AI and CSV export use). */
  snapshot: UniversalAnalyticsSnapshot;
  /** Legacy summary derived from snapshot (for existing UI). */
  metrics: ComputedMetrics;
  answer: string;
  generatedAt: string;
}
