/**
 * AI Insights – shared types for metrics and API.
 * All numbers are pre-computed; the AI only interprets and explains.
 */

export interface AIInsightsFilters {
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
}

/** Pre-computed metrics only. AI must NOT calculate or invent these. */
export interface ComputedMetrics {
  // Tickets
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
  closedRatePercent: number;
  avgResponseTimeMinutes: number;
  avgResolutionTimeMinutes: number;
  ticketsWithDependencies: number;
  ticketsWithDependenciesPercent: number;
  // SLA-style risk: open tickets older than 24h (configurable threshold)
  openOlderThan24h: number;
  openOlderThan72h: number;
  // By type
  byType: { type: string; count: number }[];
  // By client
  byClient: { client: string; count: number }[];
  // Travel
  totalTravelLogs: number;
  travelFrequencyByLocation: { location: string; count: number }[];
  totalDistanceKm: number;
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
  metrics: ComputedMetrics;
  answer: string;
  generatedAt: string;
}
