import { NextRequest, NextResponse } from 'next/server';
import { ensureCalloutAdmin, getCalloutServiceClient } from '@/app/lib/callouts/auth';
import { jsonError } from '@/app/lib/callouts/api-response';
import { writeCalloutAudit } from '@/app/lib/callouts/audit';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await ensureCalloutAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { id } = await params;
  const admin = getCalloutServiceClient();

  const { data: link } = await admin.from('callout_document_links').select('*').eq('id', id).single();
  if (!link) return jsonError('Link not found', 404);

  const { error } = await admin.from('callout_document_links').delete().eq('id', id);
  if (error) {
    logSafeError('unlink', error);
    return jsonError(getSafeErrorMessage(error), 500);
  }

  await writeCalloutAudit(admin, {
    entityType: 'link',
    entityId: id,
    action: 'link.removed',
    payload: link,
    userId: auth.userId,
  });

  return NextResponse.json({ ok: true });
}
