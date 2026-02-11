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

/** Record-level auth: member may only access reactions on non-deleted notifications; admin can view all. Returns 404 for deleted. */
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
  if (n.user_id === currentUserId) return { allowed: true };
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', currentUserId)
    .single();
  return { allowed: profile?.is_admin === true };
}

/**
 * GET /api/notifications/[id]/reactions
 * Returns summary counts and current user's reaction. Used for member detail and polling.
 */
export async function GET(
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

    const { data: rows, error } = await supabaseAdmin
      .from('notification_reactions')
      .select('user_id, reaction_type')
      .eq('notification_id', notificationId);

    if (error) {
      console.error('GET reactions:', error);
      return NextResponse.json({ error: 'Failed to load reactions' }, { status: 500 });
    }

    const list = (rows || []) as { user_id: string; reaction_type: string }[];
    const summary = { LIKE: 0, MUSCLE: 0, LAUGH: 0, COPY_THAT: 0 };
    let userReaction: typeof VALID_REACTION_TYPES[number] | null = null;

    for (const r of list) {
      if (VALID_REACTION_TYPES.includes(r.reaction_type as typeof VALID_REACTION_TYPES[number])) {
        summary[r.reaction_type as keyof typeof summary]++;
        if (r.user_id === currentUser.id) userReaction = r.reaction_type as typeof VALID_REACTION_TYPES[number];
      }
    }

    return NextResponse.json({ summary, userReaction });
  } catch (err: unknown) {
    console.error('GET /api/notifications/[id]/reactions:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
