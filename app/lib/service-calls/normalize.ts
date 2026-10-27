/** Normalize external references for duplicate matching. */
export function normalizeExternalRef(value: string | null | undefined): string | null {
  if (!value) return null;
  const n = value.trim().toUpperCase().replace(/[\s\-_/]+/g, '');
  return n.length ? n : null;
}
