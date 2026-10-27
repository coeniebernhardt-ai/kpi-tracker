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
    const { data: existing } = await auth.supabase
      .from('service_call_visits')
      .select('visit_number')
      .eq('service_call_id', id)
      .order('visit_number', { ascending: false })
      .limit(1);
    const visit_number = (existing?.[0]?.visit_number || 0) + 1;

    const visitRow = {
      service_call_id: id,
      visit_number,
      scheduled_at: body.scheduled_at || null,
      eta_at: body.eta_at || null,
      arrived_at: body.arrived_at || new Date().toISOString(),
      departed_at: body.departed_at || null,
      diagnosis: body.diagnosis || null,
      work_performed: body.work_performed || null,
      test_results: body.test_results || null,
      parts_used: body.parts_used ?? [],
      parts_none: body.parts_none === true,
      labour_minutes: body.labour_minutes ?? null,
      return_visit_required: body.return_visit_required === true,
      return_visit_reason: body.return_visit_reason || null,
      created_by: auth.userId,
    };

    const { data: visit, error } = await auth.supabase
      .from('service_call_visits')
      .insert(visitRow)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let nextStatus = 'repair_and_testing';
    if (body.return_visit_required === true) nextStatus = 'return_visit_required';
    else if (body.mark_job_card) nextStatus = 'job_card_required';
    else if (body.escalate) nextStatus = 'awaiting_parts_quote_escalation';
    else nextStatus = 'on_site';

    const scUpdate: Record<string, unknown> = {
      technical_status: nextStatus,
      arrived_at: current.arrived_at || visit.arrived_at,
    };
    if (body.escalate) {
      scUpdate.escalation_reason = body.escalation_reason || body.return_visit_reason || null;
      scUpdate.parts_required = body.parts_required === true;
      scUpdate.quotation_required = body.quotation_required === true;
      scUpdate.quotation_notes = body.quotation_notes || null;
    }

    const { data: serviceCall } = await auth.supabase
      .from('service_calls')
      .update(scUpdate)
      .eq('id', id)
      .select('*')
      .single();

    await writeServiceCallAudit(auth.supabase, {
      service_call_id: id,
      action: 'visit_recorded',
      actor_id: auth.userId,
      from_technical_status: current.technical_status,
      to_technical_status: nextStatus,
      payload_json: { visit_number, return_visit_required: visit.return_visit_required },
    });

    return NextResponse.json({ visit, serviceCall });
  } catch (err) {
    logSafeError('POST visits', err);
    return NextResponse.json({ error: getSafeErrorMessage(err) }, { status: 500 });
  }
}
