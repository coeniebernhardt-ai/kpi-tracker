import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '../../../../../lib/supabase-server';

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

/** Part 3–4: Single broadcast detail with recipient list and read status. Admin-only. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ broadcastGroupId: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { broadcastGroupId } = await params;
    if (!broadcastGroupId) return NextResponse.json({ error: 'broadcastGroupId required' }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', currentUser.id).single();
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: rows } = await supabase
      .from('notifications')
      .select('id, user_id, title, message, image_url, created_at, read, read_at')
      .eq('type', 'admin_broadcast')
      .eq('broadcast_group_id', broadcastGroupId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (!rows || rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const first = rows[0] as { title?: string | null; message?: string | null; image_url?: string | null; created_at: string };
    const recipientIds = [...new Set(rows.map((r: { user_id: string }) => r.user_id))];
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, email, role').in('id', recipientIds);

    const profileMap = new Map((profiles || []).map((p: { id: string }) => [p.id, p]));
    const recipients = rows.map((r: { user_id: string; read?: boolean; read_at?: string | null }) => {
      const p = profileMap.get(r.user_id) as { full_name?: string; email?: string; role?: string } | undefined;
      return {
        recipientId: r.user_id,
        name: p?.full_name ?? '',
        email: p?.email ?? '',
        role: p?.role ?? '',
        read: !!r.read,
        readAt: r.read_at ?? null,
      };
    });

    const totalRead = recipients.filter((r) => r.read).length;
    const total = recipients.length;

    // Read receipts: sort read first, then by readAt descending (most recent read first)
    const sortedRecipients = recipients.sort((a, b) => {
      if (a.read !== b.read) return a.read ? -1 : 1;
      return (b.readAt ?? '').localeCompare(a.readAt ?? '');
    });

    // Reactions: aggregate across all notification rows in this broadcast (each recipient has one notification)
    const notificationIds = rows.map((r: { id: string }) => r.id);
    const { data: reactionRows } = await supabase
      .from('notification_reactions')
      .select('notification_id, user_id, reaction_type')
      .in('notification_id', notificationIds);

    const reactionList = (reactionRows || []) as { notification_id: string; user_id: string; reaction_type: string }[];
    const summary = { LIKE: 0, MUSCLE: 0, LAUGH: 0, COPY_THAT: 0 };
    const validTypes = ['LIKE', 'MUSCLE', 'LAUGH', 'COPY_THAT'];
    for (const r of reactionList) {
      if (validTypes.includes(r.reaction_type)) summary[r.reaction_type as keyof typeof summary]++;
    }
    const reactorIds = [...new Set(reactionList.map((r) => r.user_id))];
    const { data: reactorProfiles } = await supabase.from('profiles').select('id, full_name').in('id', reactorIds);
    const reactorNameMap = new Map((reactorProfiles || []).map((p: { id: string; full_name?: string }) => [p.id, p.full_name ?? '']));
    const reactionsByUser = reactionList
      .filter((r) => validTypes.includes(r.reaction_type))
      .map((r) => ({ userName: reactorNameMap.get(r.user_id) || r.user_id, reactionType: r.reaction_type }))
      .sort((a, b) => a.userName.localeCompare(b.userName));

    return NextResponse.json({
      broadcastGroupId,
      title: first.title ?? null,
      message: first.message ?? '',
      imageUrl: first.image_url ?? null,
      createdAt: first.created_at,
      totalRecipients: total,
      totalRead,
      totalUnread: total - totalRead,
      readPercentage: total ? Math.round((totalRead / total) * 100) : 0,
      recipients: sortedRecipients,
      reactionsSummary: summary,
      reactionsByUser,
    });
  } catch (err: unknown) {
    console.error('GET /api/admin/notifications/broadcasts/[id]:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
