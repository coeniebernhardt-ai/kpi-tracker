/** Regex-based field extraction from OCR/PDF text (mirrors Python worker). */
export function extractFieldsFromText(
  text: string,
  config: { regex?: Record<string, string>; job_card_prefix?: string },
  docType: 'job_card' | 'invoice',
): Record<string, string> {
  const fields: Record<string, string> = {};
  const regexMap = config.regex ?? {};

  for (const [key, pattern] of Object.entries(regexMap)) {
    if (!pattern) continue;
    try {
      const re = new RegExp(pattern, 'im');
      const m = text.match(re);
      if (m?.[1]) fields[key] = m[1].trim();
    } catch {
      // skip invalid pattern
    }
  }

  const prefix = config.job_card_prefix;
  if (prefix && docType === 'job_card' && !fields.job_card_number) {
    const m = text.match(new RegExp(`(${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[A-Z0-9\\-/]+)`, 'i'));
    if (m?.[1]) fields.job_card_number = m[1];
  }

  if (docType === 'job_card') {
    const hasSig = /signature|signed/i.test(text);
    fields.signature_present = hasSig ? 'true' : 'false';
  }

  return fields;
}

export async function extractPdfText(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  // pdf-parse is CJS; dynamic import for Next.js server
  const pdfParse = (await import('pdf-parse')).default as (buf: Buffer) => Promise<{ text: string; numpages: number }>;
  const result = await pdfParse(buffer);
  return { text: result.text || '', pageCount: result.numpages || 1 };
}
