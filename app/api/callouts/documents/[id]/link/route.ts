import { NextRequest, NextResponse } from 'next/server';
import { ensureCalloutAdmin, getCalloutServiceClient } from '@/app/lib/callouts/auth';
import { jsonError } from '@/app/lib/callouts/api-response';
import { writeCalloutAudit } from '@/app/lib/callouts/audit';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await ensureCalloutAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { id: documentId } = await params;
  const body = await request.json();
  const recordId = body.calloutRecordId as string;
  const jobCardDocumentId = body.jobCardDocumentId as string | undefined;
  const invoiceDocumentId = body.invoiceDocumentId as string | undefined;

  if (!recordId) return jsonError('calloutRecordId required', 400);

  const admin = getCalloutServiceClient();
  const { data: doc } = await admin.from('callout_documents').select('*').eq('id', documentId).single();
  if (!doc) return jsonError('Document not found', 404);

  await admin
    .from('callout_documents')
    .update({ callout_record_id: recordId })
    .eq('id', documentId);

  if (jobCardDocumentId && invoiceDocumentId) {
    const { error: linkError } = await admin.from('callout_document_links').insert({
      callout_record_id: recordId,
      job_card_document_id: jobCardDocumentId,
      invoice_document_id: invoiceDocumentId,
      link_type: 'manual',
      link_evidence: body.evidence ?? {},
      created_by: auth.userId,
    });
    if (linkError) {
      logSafeError('manual link', linkError);
      return jsonError(getSafeErrorMessage(linkError), 500);
    }
  }

  await writeCalloutAudit(admin, {
    entityType: 'document',
    entityId: documentId,
    action: 'link.created',
    payload: { callout_record_id: recordId, link_type: 'manual' },
    userId: auth.userId,
  });

  return NextResponse.json({ ok: true });
}
