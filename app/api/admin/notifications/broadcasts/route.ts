import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '../../../../lib/supabase-server';
import { getSafeErrorMessage, logSafeError } from '../../../../lib/safe-api-error';

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

/** Part 3–4: List all broadcast groups for admin. Record-level: admin-only. */
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', currentUser.id).single();
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: rows } = await supabase
      .from('notifications')
      .select('id, broadcast_group_id, title, message, image_url, triggering_user_id, created_at, read, read_at, user_id')
      .eq('type', 'admin_broadcast')
      .not('broadcast_group_id', 'is', null)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    const byGroup = new Map<string, {
      broadcastGroupId: string;
      title: string | null;
      message: string;
      messagePreview: string;
      hasImage: boolean;
      createdAt: string;
      totalRecipients: number;
      totalRead: number;
      readAtList: { recipientId: string; readAt: string | null }[];
    }>();

    for (const r of rows || []) {
      const n = r as { broadcast_group_id: string; title?: string | null; message?: string | null; image_url?: string | null; created_at: string; read?: boolean; read_at?: string | null; user_id: string };
      const gid = n.broadcast_group_id;
      if (!byGroup.has(gid)) {
        byGroup.set(gid, {
          broadcastGroupId: gid,
          title: n.title ?? null,
          message: n.message ?? '',
          messagePreview: (n.message ?? '').slice(0, 80) + ((n.message ?? '').length > 80 ? '…' : ''),
          hasImage: !!(n.image_url && n.image_url.trim()),
          createdAt: n.created_at,
          totalRecipients: 0,
          totalRead: 0,
          readAtList: [],
        });
      }
      const g = byGroup.get(gid)!;
      g.totalRecipients += 1;
      if (n.read || n.read_at) g.totalRead += 1;
      g.readAtList.push({ recipientId: n.user_id, readAt: n.read_at ?? null });
    }

    const list = Array.from(byGroup.values()).map((g) => ({
      ...g,
      readPercentage: g.totalRecipients ? Math.round((g.totalRecipients ? (g.totalRead / g.totalRecipients) * 100 : 0)) : 0,
      totalUnread: g.totalRecipients - g.totalRead,
    }));

    return NextResponse.json(list);
  } catch (err: unknown) {
    logSafeError('GET /api/admin/notifications/broadcasts', err);
    return NextResponse.json({ error: getSafeErrorMessage(err) }, { status: 500 });
  }
}
