import { NextRequest, NextResponse } from 'next/server';
import {
  cleanStr,
  computeWorkflowFlags,
  handleRouteError,
  jsonError,
  loadFlagRows,
  readJson,
  scContext,
  type RouteCtx,
} from '@/app/lib/support-calls/server';

/**
 * POST /api/support-calls/[id]/close { resolution? } — managers only.
 * Closes the support call AND its ticket only when every gate passes:
 * assignee(s), contributions approved, no pending quote / open dependency,
 * job card signed (or Signature Not Obtained recorded) and finance handover sent.
 */
export async function POST(request: NextRequest, { params }: RouteCtx) {
  try {
    const { id } = await params;
    const ctx = await scContext(request, id, 'manager', { requireOpen: true });
    if (!ctx.ok) return ctx.response;
    const { auth, sc } = ctx;
    const supabase = auth.supabase;
    const body = await readJson(request);

    const rows = await loadFlagRows(supabase, sc.id);
    const f = computeWorkflowFlags(rows);
    const blockers: string[] = [];
    if (!f.hasAssignments) blockers.push('No team member was assigned');
    if (!f.hasVisits) blockers.push('No visit has been logged');
    if (f.hasOpenDependency) blockers.push('The latest visit is marked incomplete (open dependency)');
    if (f.hasPendingQuote) blockers.push('A quote decision is still pending');
    if (f.contributionsOutstanding) blockers.push('Not every assignee has an accepted contribution');
    if (f.contributionsAwaitingReview) blockers.push('A submitted contribution still needs review');
    if (!f.hasJobCard) blockers.push('No job card has been generated');
    else if (f.jobCardStatus !== 'signed' && !f.hasSignatureException) {
      blockers.push('Job card is not signed and no Signature Not Obtained exception is recorded');
    }
    if (!f.financeSent) blockers.push('Finance handover has not been confirmed as sent');

    if (blockers.length) {
      return jsonError('Support call cannot be closed yet', 409, { code: 'GATE_BLOCKED', blockers });
    }

    const now = new Date().toISOString();
    const { data: closed, error } = await supabase
      .from('support_calls')
      .update({ overall_status: 'closed', workflow_stage: 'closed', closed_at: now, closed_by: auth.userId })
      .eq('id', sc.id)
      .eq('overall_status', 'open')
      .select('*')
      .maybeSingle();
    if (error) return jsonError(error.message, 500);
    if (!closed) return jsonError('Support call is no longer open', 409);

    // Close the ticket directly (service role). The browser-side close gate only guards updateTicket.
    const { data: ticket } = await supabase
      .from('tickets')
      .select('id, status, resolution, created_at')
      .eq('id', sc.ticket_id)
      .maybeSingle();
    let ticketClosed = false;
    if (ticket && ticket.status !== 'closed') {
      const resolution =
        cleanStr(body.resolution, 5000) ||
        ticket.resolution ||
        `Resolved via support call ${sc.support_call_number}`;
      const responseMinutes = Math.max(0, Math.round((Date.now() - new Date(ticket.created_at).getTime()) / 60000));
      const { error: tErr } = await supabase
        .from('tickets')
        .update({ status: 'closed', closed_at: now, resolution, response_time_minutes: responseMinutes })
        .eq('id', sc.ticket_id);
      if (tErr) {
        // Roll back the support call so the two never disagree.
        await supabase
          .from('support_calls')
          .update({ overall_status: 'open', workflow_stage: 'ready_for_finance', closed_at: null, closed_by: null })
          .eq('id', sc.id);
        return jsonError('Could not close the linked ticket; support call left open', 500);
      }
      ticketClosed = true;
    }

    await ctx.audit('support_call_closed', {
      previous_value: { overall_status: 'open', ticket_status: ticket?.status ?? null },
      new_value: { overall_status: 'closed', ticket_status: 'closed', ticket_closed_now: ticketClosed },
    });

    return NextResponse.json({ support_call: closed, ticket_closed: ticketClosed });
  } catch (e) {
    return handleRouteError('POST /support-calls/[id]/close', e);
  }
}
