import { NextRequest, NextResponse } from 'next/server';
import { ensureCalloutAdmin, getCalloutServiceClient } from '@/app/lib/callouts/auth';
import { jsonError } from '@/app/lib/callouts/api-response';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';

export async function GET(request: NextRequest) {
  const auth = await ensureCalloutAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { searchParams } = new URL(request.url);
  const unlinked = searchParams.get('unlinked') === 'true';
  const failed = searchParams.get('failed') === 'true';
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

  const admin = getCalloutServiceClient();
  let query = admin
    .from('callout_documents')
    .select('*, contractors(name, code)')
    .order('uploaded_at', { ascending: false })
    .limit(limit);

  if (unlinked) query = query.is('callout_record_id', null);
  if (failed) query = query.eq('processing_status', 'failed');

  const { data, error } = await query;
  if (error) {
    logSafeError('callout documents list', error);
    return jsonError(getSafeErrorMessage(error), 500);
  }
  return NextResponse.json({ documents: data ?? [] });
}
