import { NextRequest, NextResponse } from 'next/server';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';
import { canAccessServiceCallRow, requireServiceCallUser } from '@/app/lib/service-calls/auth';
import { writeServiceCallAudit } from '@/app/lib/service-calls/audit';
import { listAdminIds, notifyServiceCallUsers } from '@/app/lib/service-calls/notify';
import {
  INVOICING_STATUSES,
  TECHNICAL_STATUSES,
  type InvoicingStatus,
  type ServiceCall,
  type TechnicalStatus,
} from '@/app/lib/service-calls/types';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const auth = await requireServiceCallUser(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (!auth.isAdmin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { data: current } = await auth.supabase.from('service_calls').select('*').eq('id', id).maybeSingle();
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!canAccessServiceCallRow(current as ServiceCall, auth.userId, auth.isAdmin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const reason = String(body.reason || '').trim();
    if (!reason) {
      return NextResponse.json({ error: 'reason is required for override' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (body.technical_status) {
      if (!TECHNICAL_STATUSES.includes(body.technical_status)) {
        return NextResponse.json({ error: 'Invalid technical_status' }, { status: 400 });
      }
      updates.technical_status = body.technical_status as TechnicalStatus;
      if (body.technical_status === 'closed') updates.closed_at = new Date().toISOString();
      if (body.technical_status === 'cancelled') updates.cancelled_at = new Date().toISOString();
    }
    if (body.invoicing_status) {
      if (!INVOICING_STATUSES.includes(body.invoicing_status)) {
        return NextResponse.json({ error: 'Invalid invoicing_status' }, { status: 400 });
      }
      updates.invoicing_status = body.invoicing_status as InvoicingStatus;
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json(
        { error: 'Provide technical_status and/or invoicing_status to override' },
        { status: 400 }
      );
    }

    const { data, error } = await auth.supabase
      .from('service_calls')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await writeServiceCallAudit(auth.supabase, {
      service_call_id: id,
      action: 'admin_override',
      actor_id: auth.userId,
      from_technical_status: current.technical_status,
      to_technical_status: (data.technical_status as string) || current.technical_status,
      from_invoicing_status: current.invoicing_status,
      to_invoicing_status: (data.invoicing_status as string) || current.invoicing_status,
      reason,
      payload_json: { override: true, keys: Object.keys(updates) },
    });

    const admins = await listAdminIds(auth.supabase);
    await notifyServiceCallUsers(auth.supabase, {
      userIds: [...admins, current.coordinator_id, current.assigned_technician_id],
      type: 'service_call_override',
      title: `Admin override: ${data.service_call_number}`,
      message: reason,
      ticket_id: data.ticket_id,
      triggering_user_id: auth.userId,
      triggering_user_role: 'admin',
    });

    return NextResponse.json({ serviceCall: data });
  } catch (err) {
    logSafeError('POST override', err);
    return NextResponse.json({ error: getSafeErrorMessage(err) }, { status: 500 });
  }
}
