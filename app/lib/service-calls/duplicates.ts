import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeExternalRef } from './normalize';

export type DuplicateRefInput = {
  supplier_invoice_number?: string | null;
  third_party_job_card_number?: string | null;
  po_number?: string | null;
  external_quote_reference?: string | null;
  client?: string | null;
  site_name?: string | null;
  exclude_id?: string | null;
};

export type DuplicateMatch = {
  id: string;
  service_call_number: string;
  matched_fields: string[];
};

export type DuplicateCheckResult = {
  hasPossibleDuplicate: boolean;
  exactMatch: boolean;
  safeHint: string | null;
  matches: DuplicateMatch[];
};

const REF_FIELDS = [
  { raw: 'supplier_invoice_number', norm: 'supplier_invoice_number_norm', label: 'supplier invoice reference' },
  { raw: 'third_party_job_card_number', norm: 'third_party_job_card_number_norm', label: 'third-party job card number' },
  { raw: 'po_number', norm: 'po_number_norm', label: 'PO number' },
  { raw: 'external_quote_reference', norm: 'external_quote_reference_norm', label: 'external quote reference' },
] as const;

export function buildNormalizedRefs(input: DuplicateRefInput) {
  return {
    supplier_invoice_number: input.supplier_invoice_number?.trim() || null,
    supplier_invoice_number_norm: normalizeExternalRef(input.supplier_invoice_number),
    third_party_job_card_number: input.third_party_job_card_number?.trim() || null,
    third_party_job_card_number_norm: normalizeExternalRef(input.third_party_job_card_number),
    po_number: input.po_number?.trim() || null,
    po_number_norm: normalizeExternalRef(input.po_number),
    external_quote_reference: input.external_quote_reference?.trim() || null,
    external_quote_reference_norm: normalizeExternalRef(input.external_quote_reference),
  };
}

export async function findDuplicateServiceCalls(
  supabase: SupabaseClient,
  input: DuplicateRefInput
): Promise<DuplicateCheckResult> {
  const norms = buildNormalizedRefs(input);
  const matchMap = new Map<string, DuplicateMatch>();
  let exactMatch = false;
  const hintParts: string[] = [];

  for (const field of REF_FIELDS) {
    const value = norms[field.norm];
    if (!value) continue;
    let q = supabase
      .from('service_calls')
      .select('id, service_call_number')
      .eq(field.norm, value)
      .limit(20);
    if (input.exclude_id) q = q.neq('id', input.exclude_id);
    const { data } = await q;
    if (data?.length) {
      exactMatch = true;
      hintParts.push(field.label);
      for (const row of data) {
        const existing = matchMap.get(row.id);
        if (existing) {
          if (!existing.matched_fields.includes(field.label)) existing.matched_fields.push(field.label);
        } else {
          matchMap.set(row.id, {
            id: row.id,
            service_call_number: row.service_call_number,
            matched_fields: [field.label],
          });
        }
      }
    }
  }

  // Soft candidates: same client + site + same calendar day (hint only, not blocking)
  if (input.client?.trim() && input.site_name?.trim()) {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    let soft = supabase
      .from('service_calls')
      .select('id, service_call_number')
      .ilike('client', input.client.trim())
      .ilike('site_name', input.site_name.trim())
      .gte('created_at', dayStart.toISOString())
      .limit(10);
    if (input.exclude_id) soft = soft.neq('id', input.exclude_id);
    const { data: softRows } = await soft;
    for (const row of softRows || []) {
      if (matchMap.has(row.id)) continue;
      matchMap.set(row.id, {
        id: row.id,
        service_call_number: row.service_call_number,
        matched_fields: ['same client, site, and day'],
      });
      if (!hintParts.includes('same client, site, and day')) hintParts.push('same client, site, and day');
    }
  }

  const matches = [...matchMap.values()];
  const hasPossibleDuplicate = matches.length > 0;
  const safeHint = hasPossibleDuplicate
    ? exactMatch
      ? `Matching ${hintParts.filter((h) => h !== 'same client, site, and day').join(' / ') || 'reference'} on an existing service call`
      : 'Possible duplicate: another service call today for the same client and site'
    : null;

  return { hasPossibleDuplicate, exactMatch, safeHint, matches };
}
