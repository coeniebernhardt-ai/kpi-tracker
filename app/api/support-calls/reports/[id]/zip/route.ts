import { NextRequest, NextResponse } from 'next/server';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';
import { requireSupportCallUser } from '@/app/lib/support-calls/auth';
import { writeSupportCallAudit } from '@/app/lib/support-calls/audit';
import { buildZip } from '@/app/lib/support-calls/zip';

type Ctx = { params: Promise<{ id: string }> };

export const runtime = 'nodejs';

export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const auth = await requireSupportCallUser(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (!auth.canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: sc } = await auth.supabase
      .from('support_calls')
      .select('id, support_call_number')
      .eq('id', id)
      .maybeSingle();
    if (!sc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: docs } = await auth.supabase
      .from('support_call_documents')
      .select('*')
      .eq('support_call_id', id)
      .order('created_at', { ascending: true });

    const entries: { path: string; data: Buffer }[] = [];
    const register: { file_name: string; doc_type: string; path: string }[] = [];
    const root = sc.support_call_number || id;

    for (const doc of docs || []) {
      const folderName = String(doc.doc_type || 'other').replace(/[^a-zA-Z0-9_-]/g, '_');
      const { data: fileData, error } = await auth.supabase.storage
        .from('support-call-documents')
        .download(doc.storage_path);
      if (error || !fileData) continue;
      const buf = Buffer.from(await fileData.arrayBuffer());
      const safeName = String(doc.file_name || 'file').replace(/[\\/]/g, '_');
      const path = `${root}/${folderName}/${safeName}`;
      entries.push({ path, data: buf });
      register.push({ file_name: safeName, doc_type: doc.doc_type, path });
    }

    entries.push({
      path: `${root}/attachment-register.json`,
      data: Buffer.from(JSON.stringify(register, null, 2), 'utf8'),
    });

    const out = buildZip(entries);
    await writeSupportCallAudit(auth.supabase, {
      support_call_id: id,
      actor_id: auth.userId,
      actor_role: auth.isAdmin ? 'admin' : 'hto',
      event_type: 'documents_zip_downloaded',
      new_value: { count: register.length },
      source: 'api',
    });

    return new NextResponse(new Uint8Array(out), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${sc.support_call_number}-documents.zip"`,
      },
    });
  } catch (err) {
    logSafeError('GET support-calls zip', err);
    return NextResponse.json({ error: getSafeErrorMessage(err) }, { status: 500 });
  }
}
