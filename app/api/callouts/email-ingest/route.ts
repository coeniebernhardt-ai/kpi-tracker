import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { ensureCalloutAdmin, getCalloutServiceClient } from '@/app/lib/callouts/auth';
import { jsonError } from '@/app/lib/callouts/api-response';
import { writeCalloutAudit } from '@/app/lib/callouts/audit';
import { CALLOUT_EMAIL_INGEST_ENABLED } from '@/app/lib/callouts/email-ingest';
import { enqueueCalloutPipeline } from '@/app/lib/callouts/queue';
import { CALLOUT_STORAGE_BUCKET } from '@/app/lib/callouts/types';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';

/**
 * POST /api/callouts/email-ingest
 * Admin-only stub for future mailbox automation. Body: multipart PDF + contractorId + docType.
 */
export async function POST(request: NextRequest) {
  if (!CALLOUT_EMAIL_INGEST_ENABLED) {
    return NextResponse.json({ error: 'Email ingest disabled' }, { status: 503 });
  }

  const auth = await ensureCalloutAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const contractorId = formData.get('contractorId') as string | null;
    const docType = formData.get('docType') as string | null;
    if (!file || !contractorId || (docType !== 'job_card' && docType !== 'invoice')) {
      return jsonError('file, contractorId, docType required', 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const hash = createHash('sha256').update(buffer).digest('hex');
    const admin = getCalloutServiceClient();
    const path = `email/${contractorId}/${crypto.randomUUID()}.pdf`;

    await admin.storage.from(CALLOUT_STORAGE_BUCKET).upload(path, buffer, {
      contentType: 'application/pdf',
    });

    const { data: doc, error } = await admin
      .from('callout_documents')
      .insert({
        contractor_id: contractorId,
        doc_type: docType,
        storage_path: path,
        file_name: file.name,
        file_hash_sha256: hash,
        processing_status: 'queued',
        uploaded_by: auth.userId,
        source: 'bulk_import',
      })
      .select()
      .single();

    if (error) return jsonError(getSafeErrorMessage(error), 500);
    await enqueueCalloutPipeline(admin, doc!.id, 4);

    await writeCalloutAudit(admin, {
      entityType: 'document',
      entityId: doc!.id,
      action: 'document.uploaded',
      payload: { source: 'email_ingest' },
      userId: auth.userId,
    });

    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (err) {
    logSafeError('email ingest', err);
    return jsonError(getSafeErrorMessage(err), 500);
  }
}
