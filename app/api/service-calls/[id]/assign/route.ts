import { NextRequest, NextResponse } from 'next/server';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';
import { canAccessServiceCallRow, requireServiceCallUser } from '@/app/lib/service-calls/auth';
import { writeServiceCallAudit } from '@/app/lib/service-calls/audit';
import { assertTechnicalTransition } from '@/app/lib/service-calls/transitions';
import { notifyServiceCallUsers } from '@/app/lib/service-calls/notify';
import type { ServiceCall } from '@/app/lib/service-calls/types';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const auth = await requireServiceCallUser(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { data: current, error: fetchErr } = await auth.supabase
      .from('service_calls')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr || !current) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!canAccessServiceCallRow(current as ServiceCall, auth.userId, auth.isAdmin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!auth.isAdmin) {
      return NextResponse.json({ error: 'Only admins can assign or reassign technicians' }, { status: 403 });
    }

    const body = await request.json();
    const technicianId = body.technician_id as string | undefined;
    if (!technicianId) return NextResponse.json({ error: 'technician_id required' }, { status: 400 });

    const nextStatus = 'awaiting_acceptance';
    try {
      assertTechnicalTransition(current.technical_status, nextStatus);
    } catch (e) {
      // Allow reassignment from several mid-states
      const allowedFrom = [
        'in_triage',
        'awaiting_assignment',
        'awaiting_acceptance',
        'return_visit_required',
        'awaiting_parts_quote_escalation',
        'scheduled',
      ];
      if (!allowedFrom.includes(current.technical_status)) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : 'Invalid transition' },
          { status: 400 }
        );
      }
    }

    const { data, error } = await auth.supabase
      .from('service_calls')
      .update({
        assigned_technician_id: technicianId,
        assigned_at: new Date().toISOString(),
        technical_status: nextStatus,
        accepted_at: null,
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await writeServiceCallAudit(auth.supabase, {
      service_call_id: id,
      action: 'assigned',
      actor_id: auth.userId,
      from_technical_status: current.technical_status,
      to_technical_status: nextStatus,
      payload_json: {
        previous_technician_id: current.assigned_technician_id,
        technician_id: technicianId,
      },
    });

    await notifyServiceCallUsers(auth.supabase, {
      userIds: [technicianId],
      type: 'service_call_assigned',
      title: `Assigned: ${data.service_call_number}`,
      message: data.title,
      ticket_id: data.ticket_id,
      triggering_user_id: auth.userId,
      triggering_user_role: auth.isAdmin ? 'admin' : 'member',
    });

    return NextResponse.json({ serviceCall: data });
  } catch (err) {
    logSafeError('POST assign', err);
    return NextResponse.json({ error: getSafeErrorMessage(err) }, { status: 500 });
  }
}
