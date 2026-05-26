import { NextRequest, NextResponse } from 'next/server';
import { ensureCalloutAdmin, getCalloutServiceClient } from '@/app/lib/callouts/auth';
import { jsonError } from '@/app/lib/callouts/api-response';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';

export async function GET(request: NextRequest) {
  const auth = await ensureCalloutAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { searchParams } = new URL(request.url);
  const contractorId = searchParams.get('contractorId');
  const status = searchParams.get('status');
  const q = searchParams.get('q');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  const admin = getCalloutServiceClient();
  let query = admin
    .from('callout_records')
    .select('*, contractors(id, name, code)', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (contractorId) query = query.eq('contractor_id', contractorId);
  if (status) query = query.eq('status', status);
  if (q) {
    query = query.or(
      `primary_job_card_number.ilike.%${q}%,primary_site_name.ilike.%${q}%`,
    );
  }

  const { data, error, count } = await query;
  if (error) {
    logSafeError('callout records list', error);
    return jsonError(getSafeErrorMessage(error), 500);
  }
  return NextResponse.json({ records: data ?? [], total: count ?? 0 });
}
