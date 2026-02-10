import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '../../../../lib/supabase-server';

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

/**
 * Task 2: Image proxy – resolve notification image URL server-side so the frontend
 * gets a same-origin URL. Avoids CORS/private-bucket issues; access validated per notification.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });

    const currentUser = await getCurrentUser(request);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseAdmin = getSupabaseAdmin();
    const { data: notification, error } = await supabaseAdmin
      .from('notifications')
      .select('user_id, image_url')
      .eq('id', id)
      .maybeSingle();

    if (error || !notification) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const n = notification as { user_id: string; image_url?: string | null };
    if (n.user_id !== currentUser.id) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('is_admin')
        .eq('id', currentUser.id)
        .single();
      if (profile?.is_admin !== true) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const imageUrl = n.image_url?.trim();
    if (!imageUrl) return NextResponse.json({ error: 'No image' }, { status: 404 });

    const res = await fetch(imageUrl, { method: 'GET', cache: 'force-cache' });
    if (!res.ok) {
      return NextResponse.json({ error: 'Image unavailable' }, { status: 502 });
    }

    const contentType = res.headers.get('content-type') || 'image/png';
    const body = await res.arrayBuffer();
    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err: unknown) {
    console.error('GET /api/notifications/[id]/image:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
