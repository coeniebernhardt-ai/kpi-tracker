import { NextRequest, NextResponse } from 'next/server';
import { ensureCalloutAdmin, getCalloutServiceClient } from '@/app/lib/callouts/auth';
import { jsonError } from '@/app/lib/callouts/api-response';
import { CALLOUT_STORAGE_BUCKET } from '@/app/lib/callouts/types';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await ensureCalloutAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { id } = await params;
  const admin = getCalloutServiceClient();
  const { data: doc } = await admin.from('callout_documents').select('storage_path, file_name').eq('id', id).single();
  if (!doc) return jsonError('Document not found', 404);

  const { data: signed, error } = await admin.storage
    .from(CALLOUT_STORAGE_BUCKET)
    .createSignedUrl(doc.storage_path, 300);

  if (error || !signed?.signedUrl) {
    logSafeError('callout signed url', error);
    return jsonError(getSafeErrorMessage(error), 500);
  }

  return NextResponse.json({ url: signed.signedUrl, fileName: doc.file_name });
}
