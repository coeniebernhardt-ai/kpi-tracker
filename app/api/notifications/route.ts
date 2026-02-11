import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '../../lib/supabase-server';
import { getSafeErrorMessage, logSafeError } from '../../lib/safe-api-error';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE env vars');
  }
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

/**
 * GET /api/notifications
 * Member notification list: dropdown, list page, and polling.
 * Uses service role (bypasses RLS) so filtering MUST be explicit in the query:
 *   WHERE user_id = currentUserId AND deleted_at IS NULL
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', currentUser.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      logSafeError('GET /api/notifications', error);
      return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err: unknown) {
    logSafeError('GET /api/notifications', err);
    return NextResponse.json({ error: getSafeErrorMessage(err) }, { status: 500 });
  }
}
