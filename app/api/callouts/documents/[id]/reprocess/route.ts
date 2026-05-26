import { NextRequest, NextResponse } from 'next/server';
import { ensureCalloutAdmin, getCalloutServiceClient } from '@/app/lib/callouts/auth';
import { jsonError } from '@/app/lib/callouts/api-response';
import { writeCalloutAudit } from '@/app/lib/callouts/audit';
import { processCalloutDocumentInline } from '@/app/lib/callouts/inline-process';
import { enqueueCalloutPipeline } from '@/app/lib/callouts/queue';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';

export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await ensureCalloutAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { id } = await params;
  const admin = getCalloutServiceClient();

  try {
    await admin.from('callout_documents').update({ processing_status: 'queued' }).eq('id', id);
    await enqueueCalloutPipeline(admin, id, 9).catch(() => {
      // queue optional when worker not deployed
    });

    const result = await processCalloutDocumentInline(admin, id);
    if (!result.ok) {
      return jsonError(result.error || 'Processing failed', 500);
    }

    await writeCalloutAudit(admin, {
      entityType: 'document',
      entityId: id,
      action: 'document.reprocessed',
      payload: { mode: 'inline' },
      userId: auth.userId,
    });

    return NextResponse.json({ ok: true, processed: true });
  } catch (err) {
    logSafeError('callout reprocess', err);
    return jsonError(getSafeErrorMessage(err), 500);
  }
}
