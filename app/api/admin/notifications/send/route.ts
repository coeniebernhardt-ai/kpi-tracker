import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '../../../../lib/supabase-server';
import { getSafeErrorMessage, logSafeError } from '../../../../lib/safe-api-error';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB per file (configurable)
const BUCKET = 'notification-attachments'; // Must be a private bucket in Supabase Storage

function getSupabaseAdmin() {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!u || !k) throw new Error('Missing SUPABASE env vars');
  return createClient(u, k);
}

async function getCurrentUser(request: NextRequest): Promise<{ id: string } | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return { id: user.id };
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const client = createClient(u, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user: tokenUser } } = await client.auth.getUser();
  return tokenUser ? { id: tokenUser.id } : null;
}

/** Sanitize filename for storage path: keep extension, remove path traversal. */
function sanitizeFileName(name: string): string {
  const base = name.replace(/^.*[/\\]/, '').replace(/[^\w.\- ]/g, '_').trim() || 'file';
  return base.length > 200 ? base.slice(0, 200) : base;
}

/**
 * POST /api/admin/notifications/send
 * FormData: title, message, recipientIds (JSON array string), optional "image" (legacy), and multiple "files" (any type).
 * Creates one notification per recipient, uploads each file once to private bucket, links each file to each notification.
 * Enforces 10MB per file; no MIME whitelist.
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', currentUser.id).single();
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const formData = await request.formData();
    const title = (formData.get('title') as string)?.trim() || null;
    const message = (formData.get('message') as string)?.trim();
    const recipientIdsRaw = formData.get('recipientIds');
    let recipientIds: string[] = [];
    try {
      recipientIds = Array.isArray(recipientIdsRaw)
        ? (recipientIdsRaw as string[])
        : JSON.parse(typeof recipientIdsRaw === 'string' ? recipientIdsRaw : '[]');
    } catch {
      return NextResponse.json({ error: 'Invalid recipientIds' }, { status: 400 });
    }
    const deduped = [...new Set(recipientIds)].filter((id) => id !== currentUser.id);
    if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    if (deduped.length === 0) return NextResponse.json({ error: 'At least one recipient required' }, { status: 400 });

    // Collect files: "files" (multiple) and legacy "image" (single)
    const files: File[] = [];
    const fileEntries = formData.getAll('files');
    for (const f of fileEntries) if (f instanceof File) files.push(f);
    const legacyImage = formData.get('image');
    if (legacyImage instanceof File) files.push(legacyImage);

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB limit` },
          { status: 400 }
        );
      }
    }

    const broadcastGroupId = crypto.randomUUID();
    const notificationRows = deduped.map((user_id) => ({
      user_id,
      type: 'admin_broadcast',
      ticket_id: null,
      triggering_user_role: 'admin',
      triggering_user_id: currentUser.id,
      title,
      message,
      image_url: null,
      broadcast_group_id: broadcastGroupId,
      read: false,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('notifications')
      .insert(notificationRows)
      .select('id');

    if (insertError || !inserted?.length) {
      logSafeError('notification insert', insertError);
      return NextResponse.json({ error: getSafeErrorMessage(insertError) }, { status: 500 });
    }

    const notificationIds = (inserted as { id: string }[]).map((r) => r.id);
    const uploadedMeta: { path: string; fileName: string; fileType: string; fileSize: number }[] = [];

    for (const file of files) {
      const safeName = sanitizeFileName(file.name);
      const path = `${crypto.randomUUID()}_${safeName}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
      if (uploadError) {
        logSafeError('storage upload', uploadError);
        return NextResponse.json({ error: getSafeErrorMessage(uploadError) }, { status: 500 });
      }
      uploadedMeta.push({ path, fileName: file.name, fileType: file.type || 'application/octet-stream', fileSize: file.size });
    }

    const attachmentRows: { notification_id: string; file_name: string; file_type: string; file_size: number; file_url: string }[] = [];
    for (const nid of notificationIds) {
      for (const meta of uploadedMeta) {
        attachmentRows.push({
          notification_id: nid,
          file_name: meta.fileName,
          file_type: meta.fileType,
          file_size: meta.fileSize,
          file_url: meta.path,
        });
      }
    }
    if (attachmentRows.length > 0) {
      const { error: attError } = await supabase.from('notification_attachments').insert(attachmentRows);
      if (attError) {
        logSafeError('attachment insert', attError);
        return NextResponse.json({ error: getSafeErrorMessage(attError) }, { status: 500 });
      }
    }

    return NextResponse.json({ sent: deduped.length, broadcastGroupId });
  } catch (err: unknown) {
    logSafeError('POST /api/admin/notifications/send', err);
    return NextResponse.json({ error: getSafeErrorMessage(err) }, { status: 500 });
  }
}
