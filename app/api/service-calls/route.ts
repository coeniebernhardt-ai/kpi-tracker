import { NextRequest, NextResponse } from 'next/server';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';
import { applyListScope, requireServiceCallUser } from '@/app/lib/service-calls/auth';
import { writeServiceCallAudit } from '@/app/lib/service-calls/audit';
import { nextServiceCallNumber } from '@/app/lib/service-calls/numbers';
import { listAdminIds, notifyServiceCallUsers } from '@/app/lib/service-calls/notify';
import type { CreateServiceCallInput, ServiceCallPriority } from '@/app/lib/service-calls/types';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireServiceCallUser(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = request.nextUrl;
    const status = searchParams.get('technical_status');
    const priority = searchParams.get('priority');
    const q = searchParams.get('q')?.trim();
    const linked = searchParams.get('linked'); // yes | no
    const queue = searchParams.get('queue'); // awaiting_acceptance | job_card_correction | ready_to_invoice | unassigned

    let query = auth.supabase
      .from('service_calls')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    query = applyListScope(query, auth.userId, auth.isAdmin);

    if (status) query = query.eq('technical_status', status);
    if (priority) query = query.eq('priority', priority);
    if (linked === 'yes') query = query.not('ticket_id', 'is', null);
    if (linked === 'no') query = query.is('ticket_id', null);
    if (queue === 'awaiting_acceptance') query = query.eq('technical_status', 'awaiting_acceptance');
    if (queue === 'job_card_correction') query = query.eq('technical_status', 'job_card_correction_required');
    if (queue === 'ready_to_invoice') query = query.eq('technical_status', 'ready_to_invoice');
    if (queue === 'unassigned') query = query.is('assigned_technician_id', null);
    if (q) {
      query = query.or(
        `service_call_number.ilike.%${q}%,title.ilike.%${q}%,client.ilike.%${q}%,site_name.ilike.%${q}%`
      );
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ serviceCalls: data ?? [] });
  } catch (err) {
    logSafeError('GET /api/service-calls', err);
    return NextResponse.json({ error: getSafeErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireServiceCallUser(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = (await request.json()) as CreateServiceCallInput;
    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const number = await nextServiceCallNumber(auth.supabase);
    const priority: ServiceCallPriority = body.priority || 'MEDIUM';

    const insert = {
      service_call_number: number,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      ticket_id: body.ticket_id || null,
      client: body.client?.trim() || null,
      site_name: body.site_name?.trim() || null,
      estate_or_building: body.estate_or_building?.trim() || null,
      cml_location: body.cml_location?.trim() || null,
      location: body.location || null,
      category: body.category?.trim() || null,
      fault_summary: body.fault_summary?.trim() || null,
      priority,
      contract_ref: body.contract_ref?.trim() || null,
      created_by: auth.userId,
      reported_by: auth.userId,
      coordinator_id: body.coordinator_id || auth.userId,
      coordinator_role_label: body.coordinator_role_label?.trim() || 'HTO',
      assigned_technician_id: body.assigned_technician_id || null,
      technical_status: 'new',
      invoicing_status: 'not_ready',
    };

    const { data, error } = await auth.supabase.from('service_calls').insert(insert).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await writeServiceCallAudit(auth.supabase, {
      service_call_id: data.id,
      action: 'created',
      actor_id: auth.userId,
      to_technical_status: 'new',
      to_invoicing_status: 'not_ready',
      payload_json: { ticket_id: data.ticket_id },
    });

    const admins = await listAdminIds(auth.supabase);
    await notifyServiceCallUsers(auth.supabase, {
      userIds: [...admins, data.coordinator_id],
      type: 'service_call_triage',
      title: `New service call ${data.service_call_number}`,
      message: data.title,
      ticket_id: data.ticket_id,
      triggering_user_id: auth.userId,
      triggering_user_role: auth.isAdmin ? 'admin' : 'member',
    });

    return NextResponse.json({ serviceCall: data }, { status: 201 });
  } catch (err) {
    logSafeError('POST /api/service-calls', err);
    return NextResponse.json({ error: getSafeErrorMessage(err) }, { status: 500 });
  }
}
