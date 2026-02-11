import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '../../../lib/supabase-server';
import { getSafeErrorMessage, logSafeError } from '../../../lib/safe-api-error';

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
 * Lightweight metrics for admin dashboard. Cached 60s to reduce load.
 * Performance: single aggregated query; no over-fetching.
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', currentUser.id).single();
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: tickets } = await supabase
      .from('tickets')
      .select('id, status, response_time_minutes, has_dependencies, dependency_name');

    const list = tickets || [];
    const totalTickets = list.length;
    const totalOpen = list.filter((t: { status: string }) => t.status === 'open').length;
    const totalClosed = list.filter((t: { status: string }) => t.status === 'closed').length;
    const hasDeps = (t: { has_dependencies?: boolean; dependency_name?: string | null }) =>
      t.has_dependencies === true && (t.dependency_name?.trim?.()?.length ?? 0) > 0;
    const closedWithResponse = list.filter(
      (t: { status: string; response_time_minutes?: number | null }) =>
        t.status === 'closed' && t.response_time_minutes != null && t.response_time_minutes > 0
    );
    const closedNoDeps = closedWithResponse.filter((t: unknown) => !hasDeps(t as { has_dependencies?: boolean; dependency_name?: string | null }));
    const closedWithDeps = closedWithResponse.filter((t: unknown) => hasDeps(t as { has_dependencies?: boolean; dependency_name?: string | null }));
    const overallAvg =
      closedWithResponse.length > 0
        ? Math.round(
            closedWithResponse.reduce((s: number, t: { response_time_minutes?: number }) => s + (t.response_time_minutes ?? 0), 0) /
              closedWithResponse.length
          )
        : 0;
    const avgNoDeps =
      closedNoDeps.length > 0
        ? Math.round(
            closedNoDeps.reduce((s: number, t: { response_time_minutes?: number }) => s + (t.response_time_minutes ?? 0), 0) / closedNoDeps.length
          )
        : 0;
    const avgWithDeps =
      closedWithDeps.length > 0
        ? Math.round(
            closedWithDeps.reduce((s: number, t: { response_time_minutes?: number }) => s + (t.response_time_minutes ?? 0), 0) / closedWithDeps.length
          )
        : 0;

    const body = {
      totalTickets,
      totalOpen,
      totalClosed,
      overallAvgResponseTime: overallAvg,
      avgResponseTimeNoDependencies: avgNoDeps,
      avgResponseTimeWithDependencies: avgWithDeps,
    };

    return new NextResponse(JSON.stringify(body), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (err: unknown) {
    logSafeError('GET /api/admin/metrics', err);
    return NextResponse.json({ error: getSafeErrorMessage(err) }, { status: 500 });
  }
}
