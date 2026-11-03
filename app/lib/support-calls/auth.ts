import { NextRequest } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/app/lib/supabase-server';

export type SupportCallAuth =
  | {
      ok: true;
      userId: string;
      isAdmin: boolean;
      isHto: boolean;
      canManage: boolean;
      supabase: SupabaseClient;
    }
  | { ok: false; status: 401 | 403; error: string };

export function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase server env');
  return createClient(url, key);
}

/** Admins and HTOs can manage all support calls. */
export function canManageSupportCalls(flags: { isAdmin: boolean; isHto: boolean }): boolean {
  return flags.isAdmin || flags.isHto;
}

export async function requireSupportCallUser(request: NextRequest): Promise<SupportCallAuth> {
  const server = await createSupabaseServerClient();
  const {
    data: { user: cookieUser },
  } = await server.auth.getUser();

  let userId = cookieUser?.id ?? null;

  if (!userId) {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const client = createClient(url, anon, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const {
        data: { user },
      } = await client.auth.getUser();
      userId = user?.id ?? null;
    }
  }

  if (!userId) return { ok: false, status: 401, error: 'Unauthorized' };

  const admin = getServiceRoleClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin, is_hto, is_active')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.is_active === false) {
    return { ok: false, status: 403, error: 'Account is inactive' };
  }

  const isAdmin = profile?.is_admin === true;
  const isHto = profile?.is_hto === true;

  return {
    ok: true,
    userId,
    isAdmin,
    isHto,
    canManage: canManageSupportCalls({ isAdmin, isHto }),
    supabase: admin,
  };
}
