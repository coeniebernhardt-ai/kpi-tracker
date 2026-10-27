import { NextRequest, NextResponse } from 'next/server';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';
import { requireServiceCallUser } from '@/app/lib/service-calls/auth';
import { findDuplicateServiceCalls } from '@/app/lib/service-calls/duplicates';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireServiceCallUser(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json();
    const result = await findDuplicateServiceCalls(auth.supabase, {
      supplier_invoice_number: body.supplier_invoice_number,
      third_party_job_card_number: body.third_party_job_card_number,
      po_number: body.po_number,
      external_quote_reference: body.external_quote_reference,
      client: body.client,
      site_name: body.site_name,
      exclude_id: body.exclude_id,
    });

    if (auth.isAdmin) {
      return NextResponse.json(result);
    }

    return NextResponse.json({
      hasPossibleDuplicate: result.hasPossibleDuplicate,
      exactMatch: result.exactMatch,
      safeHint: result.safeHint,
    });
  } catch (err) {
    logSafeError('POST check-duplicates', err);
    return NextResponse.json({ error: getSafeErrorMessage(err) }, { status: 500 });
  }
}
