import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '../../../../lib/supabase-server';

const BUCKET = 'notification-attachments';

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

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp']);

/**
 * GET /api/notifications/attachment/[attachmentId]
 * Secure download: auth required; admin or notification recipient only. Stream from private storage.
 * Never exposes raw storage URL.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> }
) {
  try {
    const { attachmentId } = await params;
    if (!attachmentId) return NextResponse.json({ error: 'Attachment ID required' }, { status: 400 });

    const currentUser = await getCurrentUser(request);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const { data: attachment, error: attError } = await supabase
      .from('notification_attachments')
      .select('id, notification_id, file_name, file_type, file_size, file_url')
      .eq('id', attachmentId)
      .maybeSingle();

    if (attError || !attachment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .select('id, user_id, deleted_at')
      .eq('id', (attachment as { notification_id: string }).notification_id)
      .maybeSingle();

    if (notifError || !notification) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const n = notification as { user_id: string; deleted_at?: string | null };
    if (n.deleted_at) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const isRecipient = n.user_id === currentUser.id;
    let isAdmin = false;
    if (!isRecipient) {
      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', currentUser.id).single();
      isAdmin = profile?.is_admin === true;
    }
    if (!isRecipient && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const path = (attachment as { file_url: string }).file_url;
    const { data: blob, error: downloadError } = await supabase.storage.from(BUCKET).download(path);
    if (downloadError || !blob) {
      console.error('attachment download:', downloadError);
      return NextResponse.json({ error: 'File unavailable' }, { status: 404 });
    }

    const fileName = (attachment as { file_name: string }).file_name;
    const mime = (attachment as { file_type: string }).file_type || 'application/octet-stream';
    const isImage = IMAGE_MIMES.has(mime.toLowerCase());

    const headers: HeadersInit = {
      'Content-Type': mime,
      'Content-Length': String(blob.size),
      'Cache-Control': 'private, no-cache',
    };
    if (isImage) {
      headers['Content-Disposition'] = `inline; filename="${fileName.replace(/"/g, '\\"')}"`;
    } else {
      headers['Content-Disposition'] = `attachment; filename="${fileName.replace(/"/g, '\\"')}"`;
    }

    return new NextResponse(blob, { status: 200, headers });
  } catch (err: unknown) {
    console.error('GET /api/notifications/attachment/[id]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
