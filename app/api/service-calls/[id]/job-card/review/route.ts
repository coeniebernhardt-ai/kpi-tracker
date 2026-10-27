import { NextRequest, NextResponse } from 'next/server';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';
import { canAccessServiceCallRow, requireServiceCallUser } from '@/app/lib/service-calls/auth';
import { writeServiceCallAudit } from '@/app/lib/service-calls/audit';
import { validateJobCardForAccept } from '@/app/lib/service-calls/job-card';
import { listAdminIds, notifyServiceCallUsers } from '@/app/lib/service-calls/notify';
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
    const decision = body.decision as 'accept' | 'return';
    if (decision !== 'accept' && decision !== 'return') {
      return NextResponse.json({ error: 'decision must be accept or return' }, { status: 400 });
    }

    const { data: cards } = await auth.supabase
      .from('service_call_job_cards')
      .select('*')
      .eq('service_call_id', id)
      .eq('status', 'submitted')
      .order('created_at', { ascending: false })
      .limit(1);
    const card = cards?.[0];
    if (!card) return NextResponse.json({ error: 'No submitted job card' }, { status: 400 });

    if (decision === 'return') {
      const notes = (body.correction_notes as string)?.trim();
      if (!notes) return NextResponse.json({ error: 'correction_notes required' }, { status: 400 });

      await auth.supabase
        .from('service_call_job_cards')
        .update({
          status: 'returned',
          correction_notes: notes,
          reviewed_by: auth.userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', card.id);

      const { data: serviceCall } = await auth.supabase
        .from('service_calls')
        .update({ technical_status: 'job_card_correction_required' })
        .eq('id', id)
        .select('*')
        .single();

      await writeServiceCallAudit(auth.supabase, {
        service_call_id: id,
        action: 'job_card_returned',
        actor_id: auth.userId,
        from_technical_status: current.technical_status,
        to_technical_status: 'job_card_correction_required',
        reason: notes,
      });

      await notifyServiceCallUsers(auth.supabase, {
        userIds: [card.submitted_by, current.assigned_technician_id],
        type: 'service_call_job_card_returned',
        title: `Job card returned: ${current.service_call_number}`,
        message: notes,
        ticket_id: current.ticket_id,
        triggering_user_id: auth.userId,
        triggering_user_role: auth.isAdmin ? 'admin' : 'member',
      });

      return NextResponse.json({ serviceCall });
    }

    const validation = validateJobCardForAccept(card);
    if (!validation.ok) {
      return NextResponse.json(
        { error: 'Cannot accept incomplete job card', missing: validation.missing },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    await auth.supabase
      .from('service_call_job_cards')
      .update({
        status: 'accepted',
        reviewed_by: auth.userId,
        reviewed_at: now,
        correction_notes: null,
      })
      .eq('id', card.id);

    // Sync customer signoff onto parent SC
    await auth.supabase
      .from('service_calls')
      .update({
        technical_status: 'ready_to_invoice',
        invoicing_status: 'ready_to_invoice',
        job_card_approved_at: now,
        ready_to_invoice_at: now,
        resolved_at: now,
        customer_signoff_obtained: card.customer_signoff_obtained,
        customer_signoff_notes: card.customer_signoff_notes || card.signoff_exception,
      })
      .eq('id', id);

    const { data: serviceCall } = await auth.supabase
      .from('service_calls')
      .select('*')
      .eq('id', id)
      .single();

    await writeServiceCallAudit(auth.supabase, {
      service_call_id: id,
      action: 'job_card_accepted',
      actor_id: auth.userId,
      from_technical_status: current.technical_status,
      to_technical_status: 'ready_to_invoice',
      from_invoicing_status: current.invoicing_status,
      to_invoicing_status: 'ready_to_invoice',
    });

    const admins = await listAdminIds(auth.supabase);
    await notifyServiceCallUsers(auth.supabase, {
      userIds: [...admins, current.coordinator_id, current.assigned_technician_id],
      type: 'service_call_ready_to_invoice',
      title: `Ready to invoice: ${current.service_call_number}`,
      message: current.title,
      ticket_id: current.ticket_id,
      triggering_user_id: auth.userId,
      triggering_user_role: auth.isAdmin ? 'admin' : 'member',
    });

    return NextResponse.json({ serviceCall });
  } catch (err) {
    logSafeError('POST job-card/review', err);
    return NextResponse.json({ error: getSafeErrorMessage(err) }, { status: 500 });
  }
}
