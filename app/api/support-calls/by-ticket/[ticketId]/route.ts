import { NextRequest, NextResponse } from 'next/server';
import {
  authenticate,
  getAssignment,
  handleRouteError,
  isUuid,
  jsonError,
  loadSupportCallBundle,
  type RouteCtx,
} from '@/app/lib/support-calls/server';
import type { SupportCall } from '@/app/lib/support-calls/types';

/**
 * GET /api/support-calls/by-ticket/[ticketId]
 * Used by the dashboard ticket panel and the admin ticket page.
 * Returns { support_call: null } (200) when there is no linked call OR the caller may not see it,
 * so unrelated members cannot probe for existence.
 */
export async function GET(request: NextRequest, { params }: RouteCtx<{ ticketId: string }>) {
  try {
    const { ticketId } = await params;
    if (!isUuid(ticketId)) return jsonError('Invalid ticket id', 400);

    const a = await authenticate(request);
    if (!a.ok) return a.response;
    const { auth } = a;

    const { data } = await auth.supabase
      .from('support_calls')
      .select('*')
      .eq('ticket_id', ticketId)
      .maybeSingle();
    const sc = data as SupportCall | null;
    if (!sc) return NextResponse.json({ support_call: null, can_manage: auth.canManage });

    const assignment = await getAssignment(auth.supabase, sc.id, auth.userId);
    if (!auth.canManage && !assignment) {
      return NextResponse.json({ support_call: null, can_manage: false });
    }

    const bundle = await loadSupportCallBundle(auth.supabase, sc, {
      manage: auth.canManage,
      userId: auth.userId,
    });
    return NextResponse.json({ ...bundle, user_id: auth.userId });
  } catch (e) {
    return handleRouteError('GET /support-calls/by-ticket/[ticketId]', e);
  }
}
