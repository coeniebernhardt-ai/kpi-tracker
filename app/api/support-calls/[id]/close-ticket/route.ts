import { NextRequest, NextResponse } from 'next/server';
import {
  cleanStr,
  dbError,
  handleRouteError,
  jsonError,
  readJson,
  scContext,
  type RouteCtx,
} from '@/app/lib/support-calls/server';
import { getTicketCloseBlockers, formatCloseBlockMessage } from '@/app/lib/support-calls/ticket-gate';

/**
 * POST /api/support-calls/[id]/close-ticket
 * Close the linked Think-Q ticket without closing the Support Call (job card / finance may continue).
 */
export async function POST(request: NextRequest, { params }: RouteCtx) {
  try {
    const { id } = await params;
    const ctx = await scContext(request, id, 'manager', { requireOpen: true });
    if (!ctx.ok) return ctx.response;
    const { auth, sc } = ctx;
    if (!sc.ticket_id) {
      return jsonError(
        'There is no linked ticket to close on this support call. Submit the draft first to create a Pending ticket.',
        409
      );
    }

    const blockers = await getTicketCloseBlockers(auth.supabase, sc.ticket_id);
    const relevant = blockers.filter((b) => b.id === sc.id);
    if (relevant.length) {
      return jsonError(formatCloseBlockMessage(relevant), 409, { code: 'WORK_INCOMPLETE' });
    }

    const body = await readJson(request).catch(() => ({} as Record<string, unknown>));
    const resolution = cleanStr(body.resolution, 5000) || 'Technical work complete — Support Call remains open for job card / finance.';
    const now = new Date().toISOString();

    const { data: ticket, error } = await auth.supabase
      .from('tickets')
      .update({
        status: 'closed',
        resolution,
        closed_at: now,
      })
      .eq('id', sc.ticket_id)
      .select('id, ticket_number, status')
      .maybeSingle();
    if (error) return dbError('close-ticket', error);
    if (!ticket) {
      return jsonError('Linked ticket was not found. Refresh the page and try again.', 404);
    }

    await ctx.audit('shared_ticket_closed', {
      related_id: ticket.id,
      new_value: { ticket_number: ticket.ticket_number, status: 'closed', resolution },
    });

    return NextResponse.json({ ticket, support_call_id: sc.id, support_call_remains_open: true });
  } catch (e) {
    return handleRouteError('POST /support-calls/[id]/close-ticket', e);
  }
}
