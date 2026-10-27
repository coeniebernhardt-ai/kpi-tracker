import { NextRequest } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '../supabase-server';
import type { ServiceCall } from './types';

export type ServiceCallAuth =
  | { ok: true; userId: string; isAdmin: boolean; supabase: SupabaseClient }
  | { ok: false; status: 401 | 403; error: string };

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase server env');
  return createClient(url, key);
}

export async function requireServiceCallUser(request: NextRequest): Promise<ServiceCallAuth> {
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
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', userId).maybeSingle();
  const isAdmin = profile?.is_admin === true;

  return { ok: true, userId, isAdmin, supabase: admin };
}

export function canAccessServiceCallRow(
  sc: Pick<
    ServiceCall,
    'created_by' | 'reported_by' | 'coordinator_id' | 'assigned_technician_id'
  >,
  userId: string,
  isAdmin: boolean
): boolean {
  if (isAdmin) return true;
  return (
    sc.created_by === userId ||
    sc.reported_by === userId ||
    sc.coordinator_id === userId ||
    sc.assigned_technician_id === userId
  );
}

export function applyListScope(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  userId: string,
  isAdmin: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  if (isAdmin) return query;
  return query.or(
    `created_by.eq.${userId},reported_by.eq.${userId},coordinator_id.eq.${userId},assigned_technician_id.eq.${userId}`
  );
}
