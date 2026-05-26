import { NextRequest, NextResponse } from 'next/server';
import { ensureCalloutAdmin, getCalloutServiceClient } from '@/app/lib/callouts/auth';
import { jsonError } from '@/app/lib/callouts/api-response';
import { writeCalloutAudit } from '@/app/lib/callouts/audit';
import { enqueueCalloutPipeline } from '@/app/lib/callouts/queue';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await ensureCalloutAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { id } = await params;
  const admin = getCalloutServiceClient();

  await admin.from('callout_documents').update({ processing_status: 'queued' }).eq('id', id);
  await enqueueCalloutPipeline(admin, id, 9);

  await writeCalloutAudit(admin, {
    entityType: 'document',
    entityId: id,
    action: 'document.reprocessed',
    payload: {},
    userId: auth.userId,
  });

  return NextResponse.json({ ok: true });
}
