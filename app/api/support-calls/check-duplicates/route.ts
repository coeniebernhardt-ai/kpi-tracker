import { NextRequest, NextResponse } from 'next/server';
import { authenticateManager, cleanStr, handleRouteError, isUuid, readJson } from '@/app/lib/support-calls/server';
import { findDuplicateSupportCalls } from '@/app/lib/support-calls/duplicates';

/**
 * POST /api/support-calls/check-duplicates — managers only.
 * { supplier_invoice_number?, third_party_job_card_number?, po_number?, external_quote_reference?, client?, site_name?, exclude_id? }
 */
export async function POST(request: NextRequest) {
  try {
    const a = await authenticateManager(request);
    if (!a.ok) return a.response;
    const body = await readJson(request);

    const result = await findDuplicateSupportCalls(a.auth.supabase, {
      supplier_invoice_number: cleanStr(body.supplier_invoice_number, 200),
      third_party_job_card_number: cleanStr(body.third_party_job_card_number, 200),
      po_number: cleanStr(body.po_number, 200),
      external_quote_reference: cleanStr(body.external_quote_reference, 200),
      client: cleanStr(body.client, 200),
      site_name: cleanStr(body.site_name, 200),
      exclude_id: isUuid(body.exclude_id) ? body.exclude_id : null,
    });
    return NextResponse.json(result);
  } catch (e) {
    return handleRouteError('POST /support-calls/check-duplicates', e);
  }
}
