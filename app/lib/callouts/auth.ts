import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/app/lib/supabase-server';

export type CalloutAuthResult =
  | { ok: true; userId: string; supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> }
  | { ok: false; status: 401 | 403; error: string };

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase server env');
  return createClient(url, key);
}

/** Admin-only auth for callout API routes (cookies or Bearer). */
export async function ensureCalloutAdmin(request?: NextRequest): Promise<CalloutAuthResult> {
  const bearer = request?.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();

  if (bearer) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return { ok: false, status: 401, error: 'Unauthorized' };
    const authClient = createClient(url, anonKey);
    const { data: { user }, error } = await authClient.auth.getUser(bearer);
    if (error || !user) return { ok: false, status: 401, error: 'Unauthorized' };
    const admin = getServiceClient();
    const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!profile?.is_admin) return { ok: false, status: 403, error: 'Admin only' };
    const supabase = await createSupabaseServerClient();
    return { ok: true, userId: user.id, supabase };
  }

  const supabase = await createSupabaseServerClient();
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (authError || !session?.user) return { ok: false, status: 401, error: 'Unauthorized' };
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', session.user.id)
    .single();
  if (!profile?.is_admin) return { ok: false, status: 403, error: 'Admin only' };
  return { ok: true, userId: session.user.id, supabase };
}

export function getCalloutServiceClient() {
  return getServiceClient();
}
