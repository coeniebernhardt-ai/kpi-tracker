import { NextRequest, NextResponse } from 'next/server';
import {
  dbError,
  handleRouteError,
  jsonError,
  readJson,
  scContext,
  type RouteCtx,
} from '@/app/lib/support-calls/server';

/** POST — member/manager records an offline sync conflict for HTO review. */
export async function POST(request: NextRequest, { params }: RouteCtx) {
  try {
    const { id } = await params;
    const ctx = await scContext(request, id, 'manager_or_assignee', { requireOpen: true });
    if (!ctx.ok) return ctx.response;
    const body = await readJson(request);
    const entity_type = typeof body.entity_type === 'string' ? body.entity_type.slice(0, 100) : 'unknown';
    const client_payload = body.client_payload && typeof body.client_payload === 'object' ? body.client_payload : {};

    const { data, error } = await ctx.auth.supabase
      .from('support_call_sync_conflicts')
      .insert({
        support_call_id: ctx.sc.id,
        ticket_id: ctx.sc.ticket_id,
        actor_id: ctx.auth.userId,
        entity_type,
        client_payload,
        server_payload: { note: 'Client reported conflict while flushing offline outbox' },
        status: 'open',
      })
      .select('*')
      .single();
    if (error) return dbError('sync_conflicts.create', error);

    await ctx.audit('sync_conflict_recorded', {
      related_id: data.id,
      new_value: { entity_type },
    });

    return NextResponse.json({ conflict: data }, { status: 201 });
  } catch (e) {
    return handleRouteError('POST /support-calls/[id]/sync-conflicts', e);
  }
}

/** GET — managers list open conflicts */
export async function GET(request: NextRequest, { params }: RouteCtx) {
  try {
    const { id } = await params;
    const ctx = await scContext(request, id, 'manager');
    if (!ctx.ok) return ctx.response;
    const { data, error } = await ctx.auth.supabase
      .from('support_call_sync_conflicts')
      .select('*')
      .eq('support_call_id', ctx.sc.id)
      .order('created_at', { ascending: false });
    if (error) return dbError('sync_conflicts.list', error);
    return NextResponse.json({ conflicts: data || [] });
  } catch (e) {
    return handleRouteError('GET /support-calls/[id]/sync-conflicts', e);
  }
}

/** PATCH — resolve a conflict */
export async function PATCH(request: NextRequest, { params }: RouteCtx) {
  try {
    const { id } = await params;
    const ctx = await scContext(request, id, 'manager', { requireOpen: true });
    if (!ctx.ok) return ctx.response;
    const body = await readJson(request);
    if (!body.conflict_id) return jsonError('conflict_id is required', 400);
    const notes = typeof body.resolution_notes === 'string' ? body.resolution_notes.slice(0, 2000) : null;
    const { data, error } = await ctx.auth.supabase
      .from('support_call_sync_conflicts')
      .update({
        status: 'resolved',
        resolution_notes: notes,
        resolved_by: ctx.auth.userId,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', body.conflict_id)
      .eq('support_call_id', ctx.sc.id)
      .eq('status', 'open')
      .select('*')
      .maybeSingle();
    if (error) return dbError('sync_conflicts.resolve', error);
    if (!data) return jsonError('Conflict not found or already resolved', 409);
    await ctx.audit('sync_conflict_resolved', { related_id: data.id, reason: notes });
    return NextResponse.json({ conflict: data });
  } catch (e) {
    return handleRouteError('PATCH /support-calls/[id]/sync-conflicts', e);
  }
}
