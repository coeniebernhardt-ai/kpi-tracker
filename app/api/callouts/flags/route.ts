import { NextRequest, NextResponse } from 'next/server';
import { ensureCalloutAdmin, getCalloutServiceClient } from '@/app/lib/callouts/auth';
import { jsonError } from '@/app/lib/callouts/api-response';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';

export async function GET(request: NextRequest) {
  const auth = await ensureCalloutAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'open';
  const severity = searchParams.get('severity');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

  const admin = getCalloutServiceClient();
  let query = admin
    .from('callout_flags')
    .select('*, callout_records(id, primary_job_card_number, primary_site_name, contractors(name))')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (severity) query = query.eq('severity', severity);

  const { data, error } = await query;
  if (error) {
    logSafeError('callout flags', error);
    return jsonError(getSafeErrorMessage(error), 500);
  }
  return NextResponse.json({ flags: data ?? [] });
}
