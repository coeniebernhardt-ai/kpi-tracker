import { NextRequest, NextResponse } from 'next/server';
import { ensureCalloutAdmin, getCalloutServiceClient } from '@/app/lib/callouts/auth';
import { jsonError } from '@/app/lib/callouts/api-response';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';

export async function GET(request: NextRequest) {
  const auth = await ensureCalloutAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const admin = getCalloutServiceClient();
  const { data, error } = await admin
    .from('contractors')
    .select('*, contractor_extraction_templates(id, doc_type, version, is_active)')
    .eq('is_active', true)
    .order('name');

  if (error) {
    logSafeError('callouts contractors', error);
    return jsonError(getSafeErrorMessage(error), 500);
  }
  return NextResponse.json({ contractors: data ?? [] });
}
