import { NextRequest, NextResponse } from 'next/server';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';
import { canAccessServiceCallRow, requireServiceCallUser } from '@/app/lib/service-calls/auth';
import { writeServiceCallAudit } from '@/app/lib/service-calls/audit';
import type { ServiceCall } from '@/app/lib/service-calls/types';

const BUCKET = 'service-call-documents';
const MAX_BYTES = 10 * 1024 * 1024;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const auth = await requireServiceCallUser(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { data: current } = await auth.supabase
      .from('service_calls')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!canAccessServiceCallRow(current as ServiceCall, auth.userId, auth.isAdmin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file required' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${id}/${crypto.randomUUID()}_${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await auth.supabase.storage.from(BUCKET).upload(path, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    const { data, error } = await auth.supabase
      .from('service_call_documents')
      .insert({
        service_call_id: id,
        storage_path: path,
        file_name: file.name,
        file_type: file.type || null,
        file_size: file.size,
        uploaded_by: auth.userId,
      })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await writeServiceCallAudit(auth.supabase, {
      service_call_id: id,
      action: 'document_uploaded',
      actor_id: auth.userId,
      payload_json: { document_id: data.id, file_name: file.name },
    });

    return NextResponse.json({ document: data }, { status: 201 });
  } catch (err) {
    logSafeError('POST documents', err);
    return NextResponse.json({ error: getSafeErrorMessage(err) }, { status: 500 });
  }
}
