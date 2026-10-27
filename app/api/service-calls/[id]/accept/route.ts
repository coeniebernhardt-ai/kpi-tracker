import { NextRequest, NextResponse } from 'next/server';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';
import { canAccessServiceCallRow, requireServiceCallUser } from '@/app/lib/service-calls/auth';
import { writeServiceCallAudit } from '@/app/lib/service-calls/audit';
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

    if (
      !auth.isAdmin &&
      current.assigned_technician_id &&
      current.assigned_technician_id !== auth.userId
    ) {
      return NextResponse.json({ error: 'Only the assigned technician can accept' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const eta_at = (body as { eta_at?: string }).eta_at || null;

    const { data, error } = await auth.supabase
      .from('service_calls')
      .update({
        technical_status: 'scheduled',
        accepted_at: new Date().toISOString(),
        eta_at,
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await writeServiceCallAudit(auth.supabase, {
      service_call_id: id,
      action: 'accepted',
      actor_id: auth.userId,
      from_technical_status: current.technical_status,
      to_technical_status: 'scheduled',
      payload_json: { eta_at },
    });

    await notifyServiceCallUsers(auth.supabase, {
      userIds: [current.coordinator_id, current.created_by],
      type: 'service_call_accepted',
      title: `Accepted: ${data.service_call_number}`,
      message: eta_at ? `ETA: ${eta_at}` : data.title,
      ticket_id: data.ticket_id,
      triggering_user_id: auth.userId,
      triggering_user_role: auth.isAdmin ? 'admin' : 'member',
    });

    return NextResponse.json({ serviceCall: data });
  } catch (err) {
    logSafeError('POST accept', err);
    return NextResponse.json({ error: getSafeErrorMessage(err) }, { status: 500 });
  }
}
