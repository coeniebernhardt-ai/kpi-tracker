import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '../../../lib/supabase-server';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE env vars');
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

/**
 * Get current user: try cookie-based session first (SSR), then Authorization Bearer token.
 * 401 occurs when the API route runs in a context where cookies are not available or
 * not forwarded (e.g. some serverless/edge environments). Passing the token from the
 * client fixes this while reusing the same session.
 */
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

/**
 * Notification detail: record-level authorization.
 * - Member: allowed only if notification.user_id === logged-in user id (recipient).
 * - Admin: allowed if notification.triggering_user_role === 'admin' OR admin has global access (is_admin).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    }

    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: notification, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !notification) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const recipientUserId = (notification as { user_id: string }).user_id;
    const senderRole = (notification as { triggering_user_role?: string }).triggering_user_role;

    // Record-level auth: member may only open notifications addressed to them
    let authorized = recipientUserId === currentUser.id;
    if (!authorized) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('is_admin')
        .eq('id', currentUser.id)
        .single();
      authorized = profile?.is_admin === true;
    }
    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Full payload for detail view: add sender name from profiles (triggering_user_id = sender)
    const triggeringUserId = (notification as { triggering_user_id?: string | null }).triggering_user_id;
    let sender_name: string | null = null;
    if (triggeringUserId) {
      const { data: senderProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', triggeringUserId)
        .maybeSingle();
      sender_name = senderProfile?.full_name ?? null;
    }

    const fullPayload = {
      ...notification,
      sender_name: sender_name ?? (senderRole === 'admin' ? 'Admin' : null),
    };
    return NextResponse.json(fullPayload);
  } catch (err: unknown) {
    console.error('GET /api/notifications/[id]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/** Task 4: Mark notification as read. Idempotent; same auth as GET. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    }

    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: notification, error: fetchError } = await supabaseAdmin
      .from('notifications')
      .select('user_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !notification) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const recipientUserId = (notification as { user_id: string }).user_id;
    if (recipientUserId !== currentUser.id) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('is_admin')
        .eq('id', currentUser.id)
        .single();
      if (profile?.is_admin !== true) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { data: updated, error } = await supabaseAdmin
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(updated ?? { id, read: true });
  } catch (err: unknown) {
    console.error('PATCH /api/notifications/[id]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
