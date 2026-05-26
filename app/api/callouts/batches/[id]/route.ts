import { NextRequest, NextResponse } from 'next/server';
import { ensureCalloutAdmin, getCalloutServiceClient } from '@/app/lib/callouts/auth';
import { jsonError } from '@/app/lib/callouts/api-response';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await ensureCalloutAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { id } = await params;
  const admin = getCalloutServiceClient();
  const { data: batch, error } = await admin
    .from('callout_upload_batches')
    .select('*, contractors(name, code)')
    .eq('id', id)
    .single();

  if (error || !batch) return jsonError('Batch not found', 404);

  const { count } = await admin
    .from('callout_documents')
    .select('*', { count: 'exact', head: true })
    .eq('upload_batch_id', id);

  const { count: failed } = await admin
    .from('callout_documents')
    .select('*', { count: 'exact', head: true })
    .eq('upload_batch_id', id)
    .eq('processing_status', 'failed');

  const { count: enriched } = await admin
    .from('callout_documents')
    .select('*', { count: 'exact', head: true })
    .eq('upload_batch_id', id)
    .eq('processing_status', 'enriched');

  return NextResponse.json({
    batch,
    progress: {
      uploaded: count ?? 0,
      enriched: enriched ?? 0,
      failed: failed ?? 0,
    },
  });
}
