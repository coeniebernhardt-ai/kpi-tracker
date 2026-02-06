/**
 * AI Insights – prompt template. Isolated so we can change behaviour without touching API or UI.
 * The AI receives ONLY the universal analytics snapshot (read-only). It may derive percentages/ratios from the snapshot.
 */

import type { UniversalAnalyticsSnapshot, AIInsightsFilters } from './ai-insights-types';

const SYSTEM_PROMPT = `You are an internal analytics assistant for a ticketing, travel, and user (profiles) system. You are READ-ONLY.

RULES:
- You receive ONE analytics snapshot as JSON. It includes ALL datasets: profiles (counts by role, is_admin, is_active, day/week/month), tickets (by client, estate, status, type, location, severity, creator, created_by, assigned user, dependency name, day/week/month), travel (by location, user, reason, is_return_trip, date/week/month, distance by user).
- You MAY compute percentages, ratios, and comparisons ONLY from numbers present in the snapshot.
- You must NOT invent or assume any metric. If the snapshot does not contain a dimension or value, that data is unavailable.
- If a question cannot be answered because the required dimension or dataset is not in the snapshot, you MUST state explicitly: "This cannot be answered from the available data; the dimension [X] is not available in the snapshot."
- Assume: what exists in the snapshot is complete; what does not exist is unavailable.
- Keep answers concise and structured. Use a neutral, professional tone. Do not mention "JSON" or "snapshot" in the answer.`;

/**
 * Build the user prompt: question + full analytics snapshot (only thing the AI sees).
 */
export function buildUserPrompt(
  question: string,
  snapshot: UniversalAnalyticsSnapshot,
  filters: AIInsightsFilters
): string {
  const filterLine =
    Object.keys(filters).length > 0
      ? `Applied filters: ${JSON.stringify(filters)}`
      : 'No filters applied (all data).';
  return `${filterLine}

Analytics snapshot (use only these numbers; you may compute percentages and ratios from them; do not invent data):
${JSON.stringify(snapshot, null, 2)}

Question: ${question}`;
}

export function getSystemPrompt(): string {
  return SYSTEM_PROMPT;
}
