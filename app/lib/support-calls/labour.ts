import { FIRST_HOUR_MINUTES, INTERNAL_TRAVEL_RATE_ZAR } from './constants';

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Whole minutes between arrival and departure (rounded to nearest minute).
 * Returns null if either timestamp is missing/invalid or departure precedes arrival.
 */
export function minutesBetween(
  arrived: string | Date | null | undefined,
  departed: string | Date | null | undefined
): number | null {
  const a = toDate(arrived);
  const d = toDate(departed);
  if (!a || !d) return null;
  const diff = d.getTime() - a.getTime();
  if (diff < 0) return null;
  return Math.round(diff / 60000);
}

/** Minutes beyond the first hour (never negative). */
export function excessMinutes(totalMinutes: number | null | undefined): number {
  if (totalMinutes == null || !Number.isFinite(totalMinutes)) return 0;
  return Math.max(0, Math.round(totalMinutes) - FIRST_HOUR_MINUTES);
}

/** Internal travel reimbursement in ZAR, rounded to 2 decimals. */
export function travelAmountZar(km: number | null | undefined): number {
  if (km == null || !Number.isFinite(km) || km <= 0) return 0;
  return Math.round(km * INTERNAL_TRAVEL_RATE_ZAR * 100) / 100;
}

function plural(n: number): string {
  return `${n} ${n === 1 ? 'minute' : 'minutes'}`;
}

/** e.g. "75 minutes — 15 minutes excess"; "45 minutes" when no excess. */
export function formatLabourDisplay(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes)) return '—';
  const total = Math.round(minutes);
  const excess = excessMinutes(total);
  return excess > 0 ? `${plural(total)} — ${plural(excess)} excess` : plural(total);
}
