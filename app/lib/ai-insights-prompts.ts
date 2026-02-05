/**
 * AI Insights – prompt template. Isolated so we can change behaviour without touching API or UI.
 * The AI receives ONLY pre-computed metrics (JSON); it must not calculate or invent numbers.
 */

import type { ComputedMetrics, AIInsightsFilters } from './ai-insights-types';

const SYSTEM_PROMPT = `You are an internal analytics assistant for a ticketing and travel-logging system. You are READ-ONLY.

RULES:
- You receive pre-computed metrics as JSON. Use ONLY these numbers. Do not calculate, estimate, or invent any metric.
- Explain trends, identify risks, and highlight priorities based on the given metrics.
- Keep answers concise and structured (short paragraphs or bullet points). Use a neutral, professional tone.
- If the user asks something that cannot be answered from the metrics, say so and suggest what data would be needed.
- Do not mention "JSON" or "metrics object" in the answer; speak in plain language.`;

/**
 * Build the user prompt: the question plus the metrics payload.
 * Design: single user message with structured metrics so the model has full context and no ambiguity.
 */
export function buildUserPrompt(
  question: string,
  metrics: ComputedMetrics,
  filters: AIInsightsFilters
): string {
  const filterLine =
    Object.keys(filters).length > 0
      ? `Applied filters: ${JSON.stringify(filters)}`
      : 'No filters applied (all data).';
  return `${filterLine}

Pre-computed metrics (use only these numbers; do not calculate anything yourself):
${JSON.stringify(metrics, null, 2)}

Question: ${question}`;
}

export function getSystemPrompt(): string {
  return SYSTEM_PROMPT;
}
