/**
 * AI Insights – prompt template. Isolated so we can change behaviour without touching API or UI.
 * The AI receives ONLY the universal analytics snapshot (read-only). It may derive percentages/ratios from the snapshot.
 */

import type { UniversalAnalyticsSnapshot, AIInsightsFilters } from './ai-insights-types';

const SYSTEM_PROMPT = `You are an internal analytics assistant for a ticketing and travel-logging system. You are READ-ONLY.

RULES:
- You receive a single analytics snapshot as JSON. It contains totals and breakdowns (by client, estate, status, type, location, user, day/week/month for tickets; by location, user, date and distance for travel).
- You MAY calculate percentages, ratios, and comparisons FROM the numbers in the snapshot (e.g. "client X is 40% of tickets" from ticketsByClient counts).
- You must NOT invent or assume any metric not present in the snapshot. If data is missing for a dimension, say so.
- Answer questions about: client splits, estate performance, workload distribution, cost/travel patterns, trends over time. Use the snapshot breakdowns only.
- Keep answers concise and structured (short paragraphs or bullet points). Use a neutral, professional tone.
- If the user asks something that cannot be answered from the snapshot, say so and suggest what would be needed.
- Do not mention "JSON" or "snapshot" in the answer; speak in plain language.`;

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
