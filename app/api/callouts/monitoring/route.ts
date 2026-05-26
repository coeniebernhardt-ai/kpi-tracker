import { NextRequest, NextResponse } from 'next/server';
import { ensureCalloutAdmin, getCalloutServiceClient } from '@/app/lib/callouts/auth';
import { jsonError } from '@/app/lib/callouts/api-response';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';

/** Worker queue health for ops dashboard. */
export async function GET(request: NextRequest) {
  const auth = await ensureCalloutAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const admin = getCalloutServiceClient();
  const statuses = ['pending', 'running', 'failed', 'dead_letter', 'completed'] as const;
  const jobs: Record<string, number> = {};

  for (const s of statuses) {
    const { count } = await admin
      .from('callout_processing_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', s);
    jobs[s] = count ?? 0;
  }

  const { data: recentFailures } = await admin
    .from('callout_processing_jobs')
    .select('id, document_id, job_type, error, attempts, locked_at')
    .in('status', ['failed', 'dead_letter'])
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({
    jobs,
    recentFailures: recentFailures ?? [],
    workerNote: 'Deploy services/callout-worker and set DATABASE_URL',
  });
}
