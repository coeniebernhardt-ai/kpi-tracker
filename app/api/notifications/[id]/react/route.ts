import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '../../../../lib/supabase-server';

const VALID_REACTION_TYPES = ['LIKE', 'MUSCLE', 'LAUGH', 'COPY_THAT'] as const;

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing SUPABASE env vars');
  return createClient(supabaseUrl, serviceRoleKey);
}

async function getCurrentUser(request: NextRequest): Promise<{ id: string } | null> {
  const supabaseFromCookies = await createSupabaseServerClient();
  const { data: { user } } = await supabaseFromCookies.auth.getUser();
  if (user) return { id: user.id };
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user: tokenUser } } = await client.auth.getUser();
  return tokenUser ? { id: tokenUser.id } : null;
}

async function authorizeNotificationAccess(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  notificationId: string,
  currentUserId: string
): Promise<{ allowed: boolean; deleted?: boolean }> {
  const { data: notification, error } = await supabaseAdmin
    .from('notifications')
    .select('user_id, deleted_at')
    .eq('id', notificationId)
    .maybeSingle();
  if (error || !notification) return { allowed: false };
  const n = notification as { user_id: string; deleted_at?: string | null };
  if (n.deleted_at) return { allowed: false, deleted: true };
  return { allowed: n.user_id === currentUserId };
}

/**
 * POST /api/notifications/[id]/react
 * Body: { reactionType: "LIKE" | "MUSCLE" | "LAUGH" | "COPY_THAT" }
 * Toggle logic: if user already has same reaction → remove; if different → replace; if none → insert.
 * Only the recipient (member) may react; strict enum validation.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: notificationId } = await params;
    if (!notificationId) return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });

    const currentUser = await getCurrentUser(request);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: { reactionType?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const reactionType = body.reactionType?.trim();
    if (!reactionType || !VALID_REACTION_TYPES.includes(reactionType as typeof VALID_REACTION_TYPES[number])) {
      return NextResponse.json({ error: 'Invalid reactionType. Allowed: LIKE, MUSCLE, LAUGH, COPY_THAT' }, { status: 400 });
    }
    const typedReaction = reactionType as typeof VALID_REACTION_TYPES[number];

    const supabaseAdmin = getSupabaseAdmin();
    const auth = await authorizeNotificationAccess(supabaseAdmin, notificationId, currentUser.id);
    if (!auth.allowed) {
      return NextResponse.json(
        { error: auth.deleted ? 'Not found' : 'Forbidden: only the notification recipient may react' },
        { status: auth.deleted ? 404 : 403 }
      );
    }

    const { data: existing } = await supabaseAdmin
      .from('notification_reactions')
      .select('id, reaction_type')
      .eq('notification_id', notificationId)
      .eq('user_id', currentUser.id)
      .maybeSingle();

    const existingRow = existing as { id: string; reaction_type: string } | null;

    if (existingRow) {
      if (existingRow.reaction_type === typedReaction) {
        await supabaseAdmin
          .from('notification_reactions')
          .delete()
          .eq('id', existingRow.id);
        return NextResponse.json({ reactionType: null });
      }
      await supabaseAdmin
        .from('notification_reactions')
        .update({ reaction_type: typedReaction })
        .eq('id', existingRow.id);
      return NextResponse.json({ reactionType: typedReaction });
    }

    const { error: insertError } = await supabaseAdmin
      .from('notification_reactions')
      .insert({
        notification_id: notificationId,
        user_id: currentUser.id,
        reaction_type: typedReaction,
      });

    if (insertError) {
      console.error('POST react:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    return NextResponse.json({ reactionType: typedReaction });
  } catch (err: unknown) {
    console.error('POST /api/notifications/[id]/react:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/[id]/react
 * Remove current user's reaction (recipient only).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: notificationId } = await params;
    if (!notificationId) return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });

    const currentUser = await getCurrentUser(request);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseAdmin = getSupabaseAdmin();
    const auth = await authorizeNotificationAccess(supabaseAdmin, notificationId, currentUser.id);
    if (!auth.allowed) {
      return NextResponse.json(
        { error: auth.deleted ? 'Not found' : 'Forbidden' },
        { status: auth.deleted ? 404 : 403 }
      );
    }

    await supabaseAdmin
      .from('notification_reactions')
      .delete()
      .eq('notification_id', notificationId)
      .eq('user_id', currentUser.id);

    return NextResponse.json({ reactionType: null });
  } catch (err: unknown) {
    console.error('DELETE /api/notifications/[id]/react:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
