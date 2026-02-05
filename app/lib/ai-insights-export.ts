/**
 * AI Insights – download as CSV or PDF. Client-side only.
 * Includes timestamp, filters, key metrics, and AI explanation.
 */

import type { AIInsightsResponse, ComputedMetrics } from './ai-insights-types';

function escapeCsvCell(value: string | number): string {
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Build CSV content for the current insight (timestamp, filters, metrics summary, AI text). */
export function buildInsightCsv(response: AIInsightsResponse): string {
  const m = response.metrics;
  const rows: string[][] = [
    ['AI Insights Export'],
    ['Generated at', response.generatedAt],
    ['Question', response.question],
    [],
    ['Filters', JSON.stringify(response.filters)],
    [],
    ['Key metrics'],
    ['Total tickets', String(m.totalTickets)],
    ['Open', String(m.openTickets)],
    ['Closed', String(m.closedTickets)],
    ['Closed rate %', String(m.closedRatePercent)],
    ['Avg response time (min)', String(m.avgResponseTimeMinutes)],
    ['Avg resolution time (min)', String(m.avgResolutionTimeMinutes)],
    ['Tickets with dependencies', String(m.ticketsWithDependencies)],
    ['Open older than 24h', String(m.openOlderThan24h)],
    ['Open older than 72h', String(m.openOlderThan72h)],
    ['Total travel logs', String(m.totalTravelLogs)],
    ['Total distance (km)', String(m.totalDistanceKm)],
    [],
    ['AI explanation'],
    [response.answer],
  ];
  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}

/** Trigger download of CSV file. */
export function downloadInsightCsv(response: AIInsightsResponse): void {
  const csv = buildInsightCsv(response);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ai-insights-${response.generatedAt.slice(0, 10)}-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Build HTML string for the insight (for print/PDF). */
function buildInsightHtml(response: AIInsightsResponse): string {
  const m: ComputedMetrics = response.metrics;
  const filtersStr =
    Object.keys(response.filters).length > 0
      ? JSON.stringify(response.filters)
      : 'None';
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>AI Insights Report</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 720px; margin: 24px auto; padding: 0 16px; color: #1e293b; }
    h1 { font-size: 1.25rem; margin-bottom: 8px; }
    .meta { font-size: 0.875rem; color: #64748b; margin-bottom: 24px; }
    .section { margin-bottom: 20px; }
    .section h2 { font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 8px; }
    .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 24px; font-size: 0.875rem; }
    .metrics span { color: #64748b; }
    .answer { white-space: pre-wrap; line-height: 1.5; font-size: 0.9375rem; }
  </style>
</head>
<body>
  <h1>AI Insights Report</h1>
  <div class="meta">Generated: ${response.generatedAt} · Filters: ${filtersStr}</div>
  <div class="section">
    <h2>Question</h2>
    <p>${response.question}</p>
  </div>
  <div class="section">
    <h2>Key metrics</h2>
    <div class="metrics">
      <div><span>Total tickets</span> ${m.totalTickets}</div>
      <div><span>Open / Closed</span> ${m.openTickets} / ${m.closedTickets}</div>
      <div><span>Closed rate %</span> ${m.closedRatePercent}</div>
      <div><span>Avg response (min)</span> ${m.avgResponseTimeMinutes}</div>
      <div><span>Avg resolution (min)</span> ${m.avgResolutionTimeMinutes}</div>
      <div><span>With dependencies</span> ${m.ticketsWithDependencies}</div>
      <div><span>Open &gt; 24h</span> ${m.openOlderThan24h}</div>
      <div><span>Open &gt; 72h</span> ${m.openOlderThan72h}</div>
      <div><span>Travel logs</span> ${m.totalTravelLogs}</div>
      <div><span>Distance (km)</span> ${m.totalDistanceKm}</div>
    </div>
  </div>
  <div class="section">
    <h2>AI explanation</h2>
    <div class="answer">${response.answer.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
  </div>
</body>
</html>`;
}

/** Open print dialog for the insight (user can save as PDF). */
export function downloadInsightPdf(response: AIInsightsResponse): void {
  const html = buildInsightHtml(response);
  const win = window.open('', '_blank');
  if (!win) {
    alert('Pop-up blocked. Allow pop-ups to print/save as PDF.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.afterprint = () => win.close();
  }, 300);
}
