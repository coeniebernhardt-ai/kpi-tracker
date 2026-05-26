import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ensureCalloutAdmin, getCalloutServiceClient } from '@/app/lib/callouts/auth';
import { jsonError } from '@/app/lib/callouts/api-response';
import { writeCalloutAudit } from '@/app/lib/callouts/audit';
import { enqueueCalloutPipeline } from '@/app/lib/callouts/queue';
import { CALLOUT_STORAGE_BUCKET } from '@/app/lib/callouts/types';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';

const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const auth = await ensureCalloutAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const contractorId = formData.get('contractorId') as string | null;
    const docType = formData.get('docType') as string | null;
    const batchId = formData.get('batchId') as string | null;
    const source = (formData.get('source') as string) || 'manual';

    if (!file || !(file instanceof File)) return jsonError('PDF file is required', 400);
    if (!contractorId) return jsonError('contractorId is required', 400);
    if (docType !== 'job_card' && docType !== 'invoice') return jsonError('docType must be job_card or invoice', 400);
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return jsonError('Only PDF files are allowed', 400);
    }
    if (file.size > MAX_BYTES) return jsonError('File exceeds 25MB limit', 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    const hash = createHash('sha256').update(buffer).digest('hex');

    const admin = getCalloutServiceClient();

    const { data: existing } = await admin
      .from('callout_documents')
      .select('id')
      .eq('contractor_id', contractorId)
      .eq('file_hash_sha256', hash)
      .maybeSingle();

    if (existing) {
      return jsonError('Duplicate file already uploaded for this contractor', 409);
    }

    const path = `${contractorId}/${docType}/${crypto.randomUUID()}.pdf`;
    const { error: uploadError } = await admin.storage
      .from(CALLOUT_STORAGE_BUCKET)
      .upload(path, buffer, { contentType: 'application/pdf', upsert: false });

    if (uploadError) {
      logSafeError('callout upload', uploadError);
      return jsonError(getSafeErrorMessage(uploadError), 500);
    }

    const { data: doc, error: docError } = await admin
      .from('callout_documents')
      .insert({
        contractor_id: contractorId,
        doc_type: docType,
        upload_batch_id: batchId || null,
        storage_path: path,
        file_name: file.name,
        file_hash_sha256: hash,
        processing_status: 'queued',
        uploaded_by: auth.userId,
        source: source === 'bulk_import' ? 'bulk_import' : 'manual',
      })
      .select()
      .single();

    if (docError || !doc) {
      return jsonError(getSafeErrorMessage(docError), 500);
    }

    const priority = source === 'bulk_import' ? 3 : 8;
    await enqueueCalloutPipeline(admin, doc.id, priority);

    if (batchId) {
      const { data: batch } = await admin
        .from('callout_upload_batches')
        .select('document_count')
        .eq('id', batchId)
        .single();
      if (batch) {
        await admin
          .from('callout_upload_batches')
          .update({ document_count: (batch.document_count ?? 0) + 1 })
          .eq('id', batchId);
      }
    }

    await writeCalloutAudit(admin, {
      entityType: 'document',
      entityId: doc.id,
      action: 'document.uploaded',
      payload: { file_name: file.name, doc_type: docType, contractor_id: contractorId },
      userId: auth.userId,
    });

    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (err) {
    logSafeError('callouts document upload', err);
    return jsonError(getSafeErrorMessage(err), 500);
  }
}
