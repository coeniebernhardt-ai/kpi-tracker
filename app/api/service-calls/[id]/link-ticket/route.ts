import { NextRequest, NextResponse } from 'next/server';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';
import { canAccessServiceCallRow, requireServiceCallUser } from '@/app/lib/service-calls/auth';
import { writeServiceCallAudit } from '@/app/lib/service-calls/audit';
import type { ServiceCall } from '@/app/lib/service-calls/types';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const auth = await requireServiceCallUser(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { data: current } = await auth.supabase
      .from('service_calls')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!canAccessServiceCallRow(current as ServiceCall, auth.userId, auth.isAdmin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const ticketId = body.ticket_id as string | undefined;
    if (!ticketId) return NextResponse.json({ error: 'ticket_id required' }, { status: 400 });

    const { data: ticket } = await auth.supabase
      .from('tickets')
      .select('id, ticket_number, client, issue')
      .eq('id', ticketId)
      .maybeSingle();
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

    const { data, error } = await auth.supabase
      .from('service_calls')
      .update({ ticket_id: ticketId })
      .eq('id', id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await writeServiceCallAudit(auth.supabase, {
      service_call_id: id,
      action: 'linked_ticket',
      actor_id: auth.userId,
      payload_json: {
        ticket_id: ticketId,
        ticket_number: ticket.ticket_number,
        previous_ticket_id: current.ticket_id,
      },
    });

    return NextResponse.json({ serviceCall: data, ticket });
  } catch (err) {
    logSafeError('POST link-ticket', err);
    return NextResponse.json({ error: getSafeErrorMessage(err) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const auth = await requireServiceCallUser(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { data: current } = await auth.supabase
      .from('service_calls')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!canAccessServiceCallRow(current as ServiceCall, auth.userId, auth.isAdmin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const prev = current.ticket_id;
    const { data, error } = await auth.supabase
      .from('service_calls')
      .update({ ticket_id: null })
      .eq('id', id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await writeServiceCallAudit(auth.supabase, {
      service_call_id: id,
      action: 'unlinked_ticket',
      actor_id: auth.userId,
      payload_json: { previous_ticket_id: prev },
    });

    return NextResponse.json({ serviceCall: data });
  } catch (err) {
    logSafeError('DELETE link-ticket', err);
    return NextResponse.json({ error: getSafeErrorMessage(err) }, { status: 500 });
  }
}
