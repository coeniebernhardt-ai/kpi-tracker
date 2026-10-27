import { NextRequest, NextResponse } from 'next/server';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';
import { applyListScope, requireServiceCallUser } from '@/app/lib/service-calls/auth';
import { getTicketCloseBlockers } from '@/app/lib/service-calls/ticket-gate';

type Ctx = { params: Promise<{ ticketId: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    const { ticketId } = await ctx.params;
    const auth = await requireServiceCallUser(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    let query = auth.supabase
      .from('service_calls')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false });
    query = applyListScope(query, auth.userId, auth.isAdmin);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Admins see all linked; members may miss some if scoped — for close gate use unscoped for ticket owner/admin
    let blockers: Awaited<ReturnType<typeof getTicketCloseBlockers>> = [];
    if (auth.isAdmin) {
      blockers = await getTicketCloseBlockers(auth.supabase, ticketId);
    } else {
      // Full gate for anyone attempting close — use service role list by ticket only
      blockers = await getTicketCloseBlockers(auth.supabase, ticketId);
    }

    return NextResponse.json({
      serviceCalls: data ?? [],
      closeBlockers: blockers,
      canCloseTicket: blockers.length === 0,
    });
  } catch (err) {
    logSafeError('GET by-ticket', err);
    return NextResponse.json({ error: getSafeErrorMessage(err) }, { status: 500 });
  }
}
