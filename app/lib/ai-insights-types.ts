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
 * Universal analytics snapshot – ALL datasets, ALL dimensions (data-driven, no question-specific logic).
 * Single source for AI and CSV export. If a dimension exists here, it is complete; if not, it is unavailable.
 */
export interface UniversalAnalyticsSnapshot {
  generatedAt: string;
  filters: AIInsightsFilters;
  profileDisplayNames: Record<string, string>;
  /** --- PROFILES (dataset) --- */
  totalProfiles: number;
  profilesByRole: { role: string; count: number }[];
  profilesByIsAdmin: { isAdmin: string; count: number }[];
  profilesByIsActive: { isActive: string; count: number }[];
  profilesByDay: { date: string; count: number }[];
  profilesByWeek: { week: string; count: number }[];
  profilesByMonth: { month: string; count: number }[];
  /** --- TICKETS (dataset) --- */
  totalTickets: number;
  totalTravelLogs: number;
  totalDistanceKm: number;
  openTickets: number;
  closedTickets: number;
  closedRatePercent: number;
  avgResponseTimeMinutes: number;
  avgResolutionTimeMinutes: number;
  ticketsWithDependencies: number;
  ticketsWithDependenciesPercent: number;
  openOlderThan24h: number;
  openOlderThan72h: number;
  ticketsByClient: { client: string; count: number }[];
  ticketsByEstate: { estate: string; count: number }[];
  ticketsByStatus: { status: string; count: number }[];
  ticketsByType: { type: string; count: number }[];
  ticketsByLocation: { location: string; count: number }[];
  ticketsBySeverity: { severity: string; count: number }[];
  ticketsByCreator: { userId: string; count: number }[];
  ticketsByCreatedBy: { userId: string; count: number }[];
  ticketsByAssignedUser: { userId: string; count: number }[];
  ticketsByDependencyName: { dependencyName: string; count: number }[];
  /** Derived from issue/resolution text via fixed taxonomy (see ai-insights-issue-nature). */
  ticketsByIssueNature: { issueNature: string; count: number }[];
  ticketsByDay: { date: string; count: number }[];
  ticketsByWeek: { week: string; count: number }[];
  ticketsByMonth: { month: string; count: number }[];
  /** --- TRAVEL (dataset) --- */
  travelByLocation: { location: string; count: number }[];
  travelByUser: { userId: string; count: number }[];
  travelByReason: { reason: string; count: number }[];
  travelByIsReturnTrip: { isReturnTrip: string; count: number }[];
  travelByDate: { date: string; count: number }[];
  travelByWeek: { week: string; count: number }[];
  travelByMonth: { month: string; count: number }[];
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
