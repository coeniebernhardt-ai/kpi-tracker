import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import {
  DOCUMENTS_BUCKET,
  cleanStr,
  dbError,
  handleRouteError,
  isUuid,
  jsonError,
  sanitizeFileName,
  scContext,
  type RouteCtx,
} from '@/app/lib/support-calls/server';

const MAX_BYTES = 15 * 1024 * 1024;
const DOC_TYPES = [
  'photo',
  'quote',
  'supplier_invoice',
  'third_party_job_card',
  'purchase_order',
  'report',
  'signed_job_card',
  'other',
];
const ALLOWED_PREFIXES = ['image/', 'text/plain'];
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
];

/** GET /api/support-calls/[id]/documents — list with short-lived signed URLs. */
export async function GET(request: NextRequest, { params }: RouteCtx) {
  try {
    const { id } = await params;
    const ctx = await scContext(request, id, 'read');
    if (!ctx.ok) return ctx.response;
    const { data, error } = await ctx.auth.supabase
      .from('support_call_documents')
      .select('*')
      .eq('support_call_id', ctx.sc.id)
      .order('created_at', { ascending: false });
    if (error) return dbError('documents.list', error);

    const documents = await Promise.all(
      (data || []).map(async (d: { storage_path: string } & Record<string, unknown>) => {
        const { data: signed } = await ctx.auth.supabase.storage
          .from(DOCUMENTS_BUCKET)
          .createSignedUrl(d.storage_path, 60 * 30);
        return { ...d, url: signed?.signedUrl ?? null };
      })
    );
    return NextResponse.json({ documents });
  } catch (e) {
    return handleRouteError('GET /support-calls/[id]/documents', e);
  }
}

/** POST /api/support-calls/[id]/documents — multipart FormData { file, doc_type?, related_visit_id?, related_quote_id?, related_job_card_id? } */
export async function POST(request: NextRequest, { params }: RouteCtx) {
  try {
    const { id } = await params;
    const ctx = await scContext(request, id, 'manager_or_assignee', { requireOpen: true });
    if (!ctx.ok) return ctx.response;
    const { auth, sc } = ctx;
    const supabase = auth.supabase;

    const form = await request.formData().catch(() => null);
    if (!form) return jsonError('Expected multipart/form-data', 400);
    const file = form.get('file');
    if (!(file instanceof File)) return jsonError('file is required', 400);
    if (file.size === 0) return jsonError('File is empty', 400);
    if (file.size > MAX_BYTES) return jsonError('File exceeds the 15 MB limit', 413);

    const type = file.type || 'application/octet-stream';
    if (!ALLOWED_PREFIXES.some((p) => type.startsWith(p)) && !ALLOWED_TYPES.includes(type)) {
      return jsonError(`File type ${type} is not allowed`, 415);
    }

    const rawType = cleanStr(form.get('doc_type'), 50) ?? 'other';
    const doc_type = DOC_TYPES.includes(rawType) ? rawType : 'other';
    // Only managers may file finance / signed documents.
    if (!auth.canManage && !['photo', 'report', 'other'].includes(doc_type)) {
      return jsonError('You can only upload photos, reports or other documents', 403);
    }

    const related: Record<string, string | null> = {
      related_visit_id: null,
      related_quote_id: null,
      related_job_card_id: null,
    };
    const checks: [string, string, string][] = [
      ['related_visit_id', 'support_call_visits', 'visit'],
      ['related_quote_id', 'support_call_quotes', 'quote'],
      ['related_job_card_id', 'support_call_job_cards', 'job card'],
    ];
    for (const [field, table, label] of checks) {
      const val = form.get(field);
      if (typeof val === 'string' && val) {
        if (!isUuid(val)) return jsonError(`Invalid ${field}`, 400);
        const { data } = await supabase
          .from(table)
          .select('id')
          .eq('id', val)
          .eq('support_call_id', sc.id)
          .maybeSingle();
        if (!data) return jsonError(`The ${label} does not belong to this support call`, 400);
        related[field] = val;
      }
    }

    const storage_path = `${sc.id}/${randomUUID()}-${sanitizeFileName(file.name)}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(storage_path, buffer, { contentType: type, upsert: false });
    if (upErr) return jsonError(`Upload failed: ${upErr.message}`, 500);

    const { data: doc, error } = await supabase
      .from('support_call_documents')
      .insert({
        support_call_id: sc.id,
        doc_type,
        storage_path,
        file_name: file.name.slice(0, 255),
        file_type: type,
        file_size: file.size,
        ...related,
        uploaded_by: auth.userId,
      })
      .select('*')
      .single();
    if (error) {
      await supabase.storage.from(DOCUMENTS_BUCKET).remove([storage_path]);
      return dbError('documents.create', error);
    }

    if (doc_type === 'quote' && related.related_quote_id) {
      await supabase
        .from('support_call_quotes')
        .update({ document_id: doc.id })
        .eq('id', related.related_quote_id)
        .is('document_id', null);
    }

    await ctx.audit('document_uploaded', {
      related_id: doc.id,
      new_value: { file_name: doc.file_name, doc_type, file_size: doc.file_size, ...related },
    });

    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (e) {
    return handleRouteError('POST /support-calls/[id]/documents', e);
  }
}
