/** Normalize job card / invoice reference for exact-match linking only. */
export function normalizeJobCardRef(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return null;
  const n = value.trim().toUpperCase().replace(/\s+/g, '');
  return n.length > 0 ? n : null;
}

export function parseNumeric(value: string | null | undefined): number | null {
  if (value == null || value === '') return null;
  const cleaned = String(value).replace(/[R\s,]/gi, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function parseDateToIso(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    const m = value.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (m) {
      const year = m[3].length === 2 ? `20${m[3]}` : m[3];
      const iso = `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
      return iso;
    }
    return null;
  }
  return d.toISOString().slice(0, 10);
}
