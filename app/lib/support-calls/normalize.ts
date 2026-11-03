/**
 * Normalize external references (invoice / PO / job card / quote numbers)
 * for duplicate matching: trim, upper-case, strip spaces and dashes
 * (underscores and slashes are also stripped so "PO_12/3" matches "PO123").
 * Returns null for empty input.
 */
export function normalizeExternalRef(value: string | null | undefined): string | null {
  if (!value) return null;
  const n = value.trim().toUpperCase().replace(/[\s\-_/]+/g, '');
  return n.length ? n : null;
}
