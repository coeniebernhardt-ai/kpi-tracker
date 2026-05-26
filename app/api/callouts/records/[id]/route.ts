import { NextRequest, NextResponse } from 'next/server';
import { ensureCalloutAdmin, getCalloutServiceClient } from '@/app/lib/callouts/auth';
import { jsonError } from '@/app/lib/callouts/api-response';
import { writeCalloutAudit } from '@/app/lib/callouts/audit';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await ensureCalloutAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { id } = await params;
  const admin = getCalloutServiceClient();

  const { data: record, error } = await admin
    .from('callout_records')
    .select('*, contractors(id, name, code)')
    .eq('id', id)
    .single();

  if (error || !record) return jsonError('Record not found', 404);

  const [docs, flags, links, comments, audit, enrichments, suggestions] = await Promise.all([
    admin.from('callout_documents').select('*').eq('callout_record_id', id),
    admin.from('callout_flags').select('*').eq('callout_record_id', id).order('created_at', { ascending: false }),
    admin.from('callout_document_links').select('*').eq('callout_record_id', id),
    admin.from('callout_comments').select('*, profiles(full_name)').eq('callout_record_id', id).order('created_at'),
    admin.from('callout_audit_log').select('*').eq('entity_id', id).order('created_at', { ascending: false }).limit(50),
    admin.from('callout_ai_enrichments').select('*').eq('target_id', id).eq('target_type', 'record').order('created_at', { ascending: false }).limit(5),
    admin
      .from('callout_link_suggestions')
      .select('*')
      .in(
        'document_id',
        (
          await admin.from('callout_documents').select('id').eq('callout_record_id', id)
        ).data?.map((d) => d.id) ?? ['00000000-0000-0000-0000-000000000000'],
      ),
  ]);

  const docIds = (docs.data ?? []).map((d) => d.id);
  let fieldValues: unknown[] = [];
  if (docIds.length) {
    const { data: fv } = await admin.from('callout_field_values').select('*').in('document_id', docIds);
    fieldValues = fv ?? [];
  }

  let extractions: unknown[] = [];
  if (docIds.length) {
    const { data: ex } = await admin
      .from('callout_extractions')
      .select('id, document_id, extracted_at, ocr_confidence_avg, template_version')
      .in('document_id', docIds)
      .order('extracted_at', { ascending: false });
    extractions = ex ?? [];
  }

  return NextResponse.json({
    record,
    documents: docs.data ?? [],
    flags: flags.data ?? [],
    links: links.data ?? [],
    comments: comments.data ?? [],
    audit: audit.data ?? [],
    enrichments: enrichments.data ?? [],
    linkSuggestions: suggestions.data ?? [],
    fieldValues,
    extractions,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await ensureCalloutAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { id } = await params;
  const body = await request.json();
  const admin = getCalloutServiceClient();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status) updates.status = body.status;

  const { data, error } = await admin
    .from('callout_records')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logSafeError('callout record patch', error);
    return jsonError(getSafeErrorMessage(error), 500);
  }

  await writeCalloutAudit(admin, {
    entityType: 'record',
    entityId: id,
    action: 'record.status_changed',
    payload: { status: body.status },
    userId: auth.userId,
  });

  return NextResponse.json({ record: data });
}
