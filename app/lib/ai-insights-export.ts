/**
 * AI Insights – download as CSV or PDF. Client-side only.
 * Full snapshot CSV = exactly what the AI sees, flattened for Excel/pivot/audit.
 */

import type { AIInsightsResponse, ComputedMetrics, UniversalAnalyticsSnapshot } from './ai-insights-types';

function escapeCsvCell(value: string | number): string {
  const s = String(value).replace(/\r?\n/g, ' ');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsvLine(cells: (string | number)[]): string {
  return cells.map(escapeCsvCell).join(',');
}

/** Flattened row: dataset, dimension_name, dimension_value, metric_name, metric_value, time_bucket. Exactly what the AI sees; pivot-table friendly. */
type FlattenRow = [string, string, string, string, string | number, string];

function pushFlatten(
  out: FlattenRow[],
  dataset: string,
  dimensionName: string,
  dimensionValue: string,
  metricName: string,
  metricValue: string | number,
  timeBucket: string
) {
  out.push([dataset, dimensionName, dimensionValue, metricName, metricValue, timeBucket]);
}

/**
 * Build CSV with ENTIRE snapshot in flattened structure.
 * Each row: dataset, dimension_name, dimension_value, metric_name, metric_value, time_bucket.
 * Excel- and pivot-friendly; EXACTLY matches what the AI sees.
 */
export function buildFlattenedSnapshotCsv(
  snapshot: UniversalAnalyticsSnapshot,
  options?: { question?: string; answer?: string }
): string {
  const rows: FlattenRow[] = [];
  const tb = '';

  // Meta
  pushFlatten(rows, 'meta', 'generatedAt', snapshot.generatedAt, 'value', 1, tb);
  pushFlatten(rows, 'meta', 'filters', JSON.stringify(snapshot.filters), 'value', 1, tb);

  // PROFILES
  pushFlatten(rows, 'profiles', 'total', '', 'count', snapshot.totalProfiles, tb);
  snapshot.profilesByRole.forEach((r) => pushFlatten(rows, 'profiles', 'role', r.role, 'count', r.count, tb));
  snapshot.profilesByIsAdmin.forEach((r) => pushFlatten(rows, 'profiles', 'is_admin', r.isAdmin, 'count', r.count, tb));
  snapshot.profilesByIsActive.forEach((r) => pushFlatten(rows, 'profiles', 'is_active', r.isActive, 'count', r.count, tb));
  snapshot.profilesByDay.forEach((r) => pushFlatten(rows, 'profiles', 'created_date', r.date, 'count', r.count, 'day'));
  snapshot.profilesByWeek.forEach((r) => pushFlatten(rows, 'profiles', 'created_week', r.week, 'count', r.count, 'week'));
  snapshot.profilesByMonth.forEach((r) => pushFlatten(rows, 'profiles', 'created_month', r.month, 'count', r.count, 'month'));

  // TICKETS (totals and scalar metrics)
  pushFlatten(rows, 'tickets', 'total', '', 'count', snapshot.totalTickets, tb);
  pushFlatten(rows, 'tickets', 'open', '', 'count', snapshot.openTickets, tb);
  pushFlatten(rows, 'tickets', 'closed', '', 'count', snapshot.closedTickets, tb);
  pushFlatten(rows, 'tickets', 'closed_rate', '', 'percent', snapshot.closedRatePercent, tb);
  pushFlatten(rows, 'tickets', 'avg_response_minutes', '', 'value', snapshot.avgResponseTimeMinutes, tb);
  pushFlatten(rows, 'tickets', 'avg_resolution_minutes', '', 'value', snapshot.avgResolutionTimeMinutes, tb);
  pushFlatten(rows, 'tickets', 'with_dependencies', '', 'count', snapshot.ticketsWithDependencies, tb);
  pushFlatten(rows, 'tickets', 'open_older_24h', '', 'count', snapshot.openOlderThan24h, tb);
  pushFlatten(rows, 'tickets', 'open_older_72h', '', 'count', snapshot.openOlderThan72h, tb);
  snapshot.ticketsByClient.forEach((r) => pushFlatten(rows, 'tickets', 'client', r.client, 'count', r.count, tb));
  snapshot.ticketsByEstate.forEach((r) => pushFlatten(rows, 'tickets', 'estate', r.estate, 'count', r.count, tb));
  snapshot.ticketsByStatus.forEach((r) => pushFlatten(rows, 'tickets', 'status', r.status, 'count', r.count, tb));
  snapshot.ticketsByType.forEach((r) => pushFlatten(rows, 'tickets', 'type', r.type, 'count', r.count, tb));
  snapshot.ticketsByLocation.forEach((r) => pushFlatten(rows, 'tickets', 'location', r.location, 'count', r.count, tb));
  snapshot.ticketsBySeverity.forEach((r) => pushFlatten(rows, 'tickets', 'severity', r.severity, 'count', r.count, tb));
  snapshot.ticketsByCreator.forEach((r) => pushFlatten(rows, 'tickets', 'creator_user_id', r.userId, 'count', r.count, tb));
  snapshot.ticketsByCreatedBy.forEach((r) => pushFlatten(rows, 'tickets', 'created_by_user_id', r.userId, 'count', r.count, tb));
  snapshot.ticketsByAssignedUser.forEach((r) => pushFlatten(rows, 'tickets', 'assigned_user_id', r.userId, 'count', r.count, tb));
  snapshot.ticketsByDependencyName.forEach((r) => pushFlatten(rows, 'tickets', 'dependency_name', r.dependencyName, 'count', r.count, tb));
  snapshot.ticketsByDay.forEach((r) => pushFlatten(rows, 'tickets', 'created_date', r.date, 'count', r.count, 'day'));
  snapshot.ticketsByWeek.forEach((r) => pushFlatten(rows, 'tickets', 'created_week', r.week, 'count', r.count, 'week'));
  snapshot.ticketsByMonth.forEach((r) => pushFlatten(rows, 'tickets', 'created_month', r.month, 'count', r.count, 'month'));

  // TRAVEL
  pushFlatten(rows, 'travel', 'total', '', 'count', snapshot.totalTravelLogs, tb);
  pushFlatten(rows, 'travel', 'total_distance_km', '', 'sum', snapshot.totalDistanceKm, tb);
  snapshot.travelByLocation.forEach((r) => pushFlatten(rows, 'travel', 'location', r.location, 'count', r.count, tb));
  snapshot.travelByUser.forEach((r) => pushFlatten(rows, 'travel', 'user_id', r.userId, 'count', r.count, tb));
  snapshot.travelByReason.forEach((r) => pushFlatten(rows, 'travel', 'reason', r.reason, 'count', r.count, tb));
  snapshot.travelByIsReturnTrip.forEach((r) => pushFlatten(rows, 'travel', 'is_return_trip', r.isReturnTrip, 'count', r.count, tb));
  snapshot.travelByDate.forEach((r) => pushFlatten(rows, 'travel', 'date', r.date, 'count', r.count, 'day'));
  snapshot.travelByWeek.forEach((r) => pushFlatten(rows, 'travel', 'week', r.week, 'count', r.count, 'week'));
  snapshot.travelByMonth.forEach((r) => pushFlatten(rows, 'travel', 'month', r.month, 'count', r.count, 'month'));
  snapshot.travelDistanceByUser.forEach((r) => pushFlatten(rows, 'travel', 'user_id', r.userId, 'total_distance_km', r.totalDistanceKm, tb));

  const lines = [toCsvLine(['dataset', 'dimension_name', 'dimension_value', 'metric_name', 'metric_value', 'time_bucket'])];
  rows.forEach((r) => lines.push(toCsvLine(r)));

  if (options?.question != null) {
    lines.push('');
    lines.push(toCsvLine(['question', options.question.replace(/\r?\n/g, ' ')]));
  }
  if (options?.answer != null) {
    lines.push(toCsvLine(['ai_answer', options.answer.replace(/\r?\n/g, ' ')]));
  }

  const BOM = '\uFEFF';
  return BOM + lines.join('\r\n');
}

/** Build CSV with ALL analytics dimensions (section-based). Kept for human readability. */
export function buildFullSnapshotCsv(
  snapshot: UniversalAnalyticsSnapshot,
  options?: { question?: string; answer?: string }
): string {
  const lines: string[] = [];
  lines.push(toCsvLine(['AI Insights – Full Analytics Snapshot (read-only)']));
  lines.push(toCsvLine(['Generated at', snapshot.generatedAt]));
  lines.push(toCsvLine(['Filters', JSON.stringify(snapshot.filters)]));
  lines.push('');

  lines.push(toCsvLine(['Profiles – total', snapshot.totalProfiles]));
  lines.push(toCsvLine(['Profiles by role']));
  lines.push(toCsvLine(['Role', 'Count']));
  snapshot.profilesByRole.forEach((r) => lines.push(toCsvLine([r.role, r.count])));
  lines.push('');
  lines.push(toCsvLine(['Profiles by is_admin', 'Count']));
  snapshot.profilesByIsAdmin.forEach((r) => lines.push(toCsvLine([r.isAdmin, r.count])));
  lines.push('');
  lines.push(toCsvLine(['Profiles by is_active', 'Count']));
  snapshot.profilesByIsActive.forEach((r) => lines.push(toCsvLine([r.isActive, r.count])));
  lines.push('');
  lines.push(toCsvLine(['Profiles by day', 'Date', 'Count']));
  snapshot.profilesByDay.forEach((r) => lines.push(toCsvLine([r.date, r.count])));
  lines.push('');
  lines.push(toCsvLine(['Profiles by week', 'Week', 'Count']));
  snapshot.profilesByWeek.forEach((r) => lines.push(toCsvLine([r.week, r.count])));
  lines.push('');
  lines.push(toCsvLine(['Profiles by month', 'Month', 'Count']));
  snapshot.profilesByMonth.forEach((r) => lines.push(toCsvLine([r.month, r.count])));
  lines.push('');

  lines.push(toCsvLine(['Tickets – Summary']));
  lines.push(toCsvLine(['Total tickets', snapshot.totalTickets]));
  lines.push(toCsvLine(['Open tickets', snapshot.openTickets]));
  lines.push(toCsvLine(['Closed tickets', snapshot.closedTickets]));
  lines.push(toCsvLine(['Closed rate %', snapshot.closedRatePercent]));
  lines.push(toCsvLine(['Avg response time (min)', snapshot.avgResponseTimeMinutes]));
  lines.push(toCsvLine(['Avg resolution time (min)', snapshot.avgResolutionTimeMinutes]));
  lines.push(toCsvLine(['Tickets with dependencies', snapshot.ticketsWithDependencies]));
  lines.push(toCsvLine(['Open older than 24h', snapshot.openOlderThan24h]));
  lines.push(toCsvLine(['Open older than 72h', snapshot.openOlderThan72h]));
  lines.push('');

  lines.push(toCsvLine(['Tickets by client']));
  lines.push(toCsvLine(['Client', 'Count']));
  snapshot.ticketsByClient.forEach((r) => lines.push(toCsvLine([r.client, r.count])));
  lines.push('');
  lines.push(toCsvLine(['Tickets by estate']));
  lines.push(toCsvLine(['Estate', 'Count']));
  snapshot.ticketsByEstate.forEach((r) => lines.push(toCsvLine([r.estate, r.count])));
  lines.push('');
  lines.push(toCsvLine(['Tickets by status']));
  lines.push(toCsvLine(['Status', 'Count']));
  snapshot.ticketsByStatus.forEach((r) => lines.push(toCsvLine([r.status, r.count])));
  lines.push('');
  lines.push(toCsvLine(['Tickets by type']));
  lines.push(toCsvLine(['Type', 'Count']));
  snapshot.ticketsByType.forEach((r) => lines.push(toCsvLine([r.type, r.count])));
  lines.push('');
  lines.push(toCsvLine(['Tickets by location']));
  lines.push(toCsvLine(['Location', 'Count']));
  snapshot.ticketsByLocation.forEach((r) => lines.push(toCsvLine([r.location, r.count])));
  lines.push('');
  lines.push(toCsvLine(['Tickets by severity']));
  lines.push(toCsvLine(['Severity', 'Count']));
  snapshot.ticketsBySeverity.forEach((r) => lines.push(toCsvLine([r.severity, r.count])));
  lines.push('');
  lines.push(toCsvLine(['Tickets by creator']));
  lines.push(toCsvLine(['User id', 'Count']));
  snapshot.ticketsByCreator.forEach((r) => lines.push(toCsvLine([r.userId, r.count])));
  lines.push('');
  lines.push(toCsvLine(['Tickets by created_by']));
  lines.push(toCsvLine(['User id', 'Count']));
  snapshot.ticketsByCreatedBy.forEach((r) => lines.push(toCsvLine([r.userId, r.count])));
  lines.push('');
  lines.push(toCsvLine(['Tickets by assigned user']));
  lines.push(toCsvLine(['User id', 'Count']));
  snapshot.ticketsByAssignedUser.forEach((r) => lines.push(toCsvLine([r.userId, r.count])));
  lines.push('');
  lines.push(toCsvLine(['Tickets by dependency name']));
  lines.push(toCsvLine(['Dependency name', 'Count']));
  snapshot.ticketsByDependencyName.forEach((r) => lines.push(toCsvLine([r.dependencyName, r.count])));
  lines.push('');
  lines.push(toCsvLine(['Tickets by day']));
  lines.push(toCsvLine(['Date', 'Count']));
  snapshot.ticketsByDay.forEach((r) => lines.push(toCsvLine([r.date, r.count])));
  lines.push('');
  lines.push(toCsvLine(['Tickets by week']));
  lines.push(toCsvLine(['Week', 'Count']));
  snapshot.ticketsByWeek.forEach((r) => lines.push(toCsvLine([r.week, r.count])));
  lines.push('');
  lines.push(toCsvLine(['Tickets by month']));
  lines.push(toCsvLine(['Month', 'Count']));
  snapshot.ticketsByMonth.forEach((r) => lines.push(toCsvLine([r.month, r.count])));
  lines.push('');

  lines.push(toCsvLine(['Travel – Summary']));
  lines.push(toCsvLine(['Total travel logs', snapshot.totalTravelLogs]));
  lines.push(toCsvLine(['Total distance (km)', snapshot.totalDistanceKm]));
  lines.push('');
  lines.push(toCsvLine(['Travel by location', 'Location', 'Count']));
  snapshot.travelByLocation.forEach((r) => lines.push(toCsvLine([r.location, r.count])));
  lines.push('');
  lines.push(toCsvLine(['Travel by user', 'User id', 'Count']));
  snapshot.travelByUser.forEach((r) => lines.push(toCsvLine([r.userId, r.count])));
  lines.push('');
  lines.push(toCsvLine(['Travel by reason', 'Reason', 'Count']));
  snapshot.travelByReason.forEach((r) => lines.push(toCsvLine([r.reason, r.count])));
  lines.push('');
  lines.push(toCsvLine(['Travel by is_return_trip', 'Is return trip', 'Count']));
  snapshot.travelByIsReturnTrip.forEach((r) => lines.push(toCsvLine([r.isReturnTrip, r.count])));
  lines.push('');
  lines.push(toCsvLine(['Travel by date', 'Date', 'Count']));
  snapshot.travelByDate.forEach((r) => lines.push(toCsvLine([r.date, r.count])));
  lines.push('');
  lines.push(toCsvLine(['Travel by week', 'Week', 'Count']));
  snapshot.travelByWeek.forEach((r) => lines.push(toCsvLine([r.week, r.count])));
  lines.push('');
  lines.push(toCsvLine(['Travel by month', 'Month', 'Count']));
  snapshot.travelByMonth.forEach((r) => lines.push(toCsvLine([r.month, r.count])));
  lines.push('');
  lines.push(toCsvLine(['Travel distance by user', 'User id', 'Total distance (km)']));
  snapshot.travelDistanceByUser.forEach((r) => lines.push(toCsvLine([r.userId, r.totalDistanceKm])));
  lines.push('');

  if (options?.question != null) {
    lines.push(toCsvLine(['Question']));
    lines.push(toCsvLine([options.question]));
    lines.push('');
  }
  if (options?.answer != null) {
    lines.push(toCsvLine(['AI explanation']));
    lines.push(toCsvLine([options.answer.replace(/\r?\n/g, ' ')]));
  }

  const BOM = '\uFEFF';
  return BOM + lines.join('\r\n');
}

/** Download full snapshot CSV – flattened format (dataset, dimension_name, dimension_value, metric_name, metric_value, time_bucket). Exactly what the AI sees; Excel/pivot ready. */
export function downloadFullSnapshotCsv(response: AIInsightsResponse): void {
  const csv = buildFlattenedSnapshotCsv(response.snapshot, {
    question: response.question,
    answer: response.answer,
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ai-insights-snapshot-${response.generatedAt.slice(0, 10)}-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Build CSV content for the current insight (timestamp, filters, metrics summary, AI text). Legacy short form. */
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
  return rows.map((row) => toCsvLine(row)).join('\r\n');
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
    win.onafterprint = () => win.close();
  }, 300);
}
