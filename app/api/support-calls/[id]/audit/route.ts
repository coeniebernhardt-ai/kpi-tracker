import { NextRequest, NextResponse } from 'next/server';
import {
  dbError,
  handleRouteError,
  loadProfilesById,
  scContext,
  type RouteCtx,
} from '@/app/lib/support-calls/server';

/** GET /api/support-calls/[id]/audit — managers only. ?limit=200&before=<iso> */
export async function GET(request: NextRequest, { params }: RouteCtx) {
  try {
    const { id } = await params;
    const ctx = await scContext(request, id, 'manager');
    if (!ctx.ok) return ctx.response;
    const sp = request.nextUrl.searchParams;
    const limit = Math.min(Math.max(parseInt(sp.get('limit') || '200', 10) || 200, 1), 500);
    const before = sp.get('before');

    let query = ctx.auth.supabase
      .from('support_call_audit_events')
      .select('*')
      .eq('support_call_id', ctx.sc.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (before && !Number.isNaN(new Date(before).getTime())) query = query.lt('created_at', before);

    const { data, error } = await query;
    if (error) return dbError('audit', error);
    const events = (data || []) as Array<{ actor_id: string | null } & Record<string, unknown>>;
    const profiles = await loadProfilesById(ctx.auth.supabase, events.map((e) => e.actor_id));
    return NextResponse.json({
      events: events.map((e) => ({
        ...e,
        actor_name: e.actor_id ? profiles[e.actor_id]?.full_name ?? null : null,
      })),
    });
  } catch (e) {
    return handleRouteError('GET /support-calls/[id]/audit', e);
  }
}
