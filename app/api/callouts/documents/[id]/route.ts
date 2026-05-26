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
  const { data, error } = await admin.from('callout_documents').select('*').eq('id', id).single();
  if (error || !data) return jsonError('Document not found', 404);

  const { data: fields } = await admin.from('callout_field_values').select('*').eq('document_id', id);
  const { data: extractions } = await admin
    .from('callout_extractions')
    .select('id, extracted_at, ocr_confidence_avg, template_version, ocr_text')
    .eq('document_id', id)
    .order('extracted_at', { ascending: false })
    .limit(3);

  return NextResponse.json({ document: data, fieldValues: fields ?? [], extractions: extractions ?? [] });
}
