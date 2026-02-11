import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '../../../../lib/supabase-server';

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

/**
 * SOFT DELETE: set deleted_at on notification rows so they are hidden from members and export.
 * Admin only. All member queries filter deleted_at IS NULL; deleted notifications return 404.
 *
 * - broadcastGroupId: soft-delete ALL per-recipient notification rows with that broadcast_group_id.
 * - notificationId: soft-delete that single notification (e.g. non-broadcast or manual).
 * Reactions and attachments are left in place; access is blocked because notification is deleted.
 */
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', currentUser.id).single();
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const url = request.nextUrl;
    const notificationId = url.searchParams.get('notificationId');
    const broadcastGroupId = url.searchParams.get('broadcastGroupId');

    const deletedAt = new Date().toISOString();

    if (broadcastGroupId) {
      // Soft-delete ALL per-recipient rows for this broadcast so members never see them
      const { data: rows, error } = await supabase
        .from('notifications')
        .update({ deleted_at: deletedAt })
        .eq('broadcast_group_id', broadcastGroupId)
        .is('deleted_at', null)
        .select('id');

      if (error) {
        console.error('DELETE broadcast group:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      const count = (rows ?? []).length;
      return NextResponse.json({ deleted: count, broadcastGroupId });
    }

    if (notificationId) {
      const { data: row, error } = await supabase
        .from('notifications')
        .update({ deleted_at: deletedAt })
        .eq('id', notificationId)
        .is('deleted_at', null)
        .select('id')
        .maybeSingle();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (!row) return NextResponse.json({ error: 'Not found or already deleted' }, { status: 404 });
      return NextResponse.json({ deleted: 1, notificationId });
    }

    return NextResponse.json({ error: 'Provide notificationId or broadcastGroupId' }, { status: 400 });
  } catch (err: unknown) {
    console.error('DELETE /api/admin/notifications/delete:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
