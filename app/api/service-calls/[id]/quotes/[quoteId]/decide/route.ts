import { NextRequest, NextResponse } from 'next/server';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';
import { canAccessServiceCallRow, requireServiceCallUser } from '@/app/lib/service-calls/auth';
import { writeServiceCallAudit } from '@/app/lib/service-calls/audit';
import { listAdminIds, notifyServiceCallUsers } from '@/app/lib/service-calls/notify';
import type { ServiceCall } from '@/app/lib/service-calls/types';

type Ctx = { params: Promise<{ id: string; quoteId: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { id, quoteId } = await ctx.params;
    const auth = await requireServiceCallUser(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { data: current } = await auth.supabase.from('service_calls').select('*').eq('id', id).maybeSingle();
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!canAccessServiceCallRow(current as ServiceCall, auth.userId, auth.isAdmin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const isAssignee = current.assigned_technician_id === auth.userId;
    if (!auth.isAdmin && !isAssignee) {
      return NextResponse.json({ error: 'Only the assignee or an admin can decide a quote' }, { status: 403 });
    }

    const body = await request.json();
    const decision = body.decision as 'approve' | 'reject' | undefined;
    if (decision !== 'approve' && decision !== 'reject') {
      return NextResponse.json({ error: 'decision must be approve or reject' }, { status: 400 });
    }
    if (decision === 'reject' && !String(body.reason || '').trim()) {
      return NextResponse.json({ error: 'reason is required when rejecting' }, { status: 400 });
    }

    const next_step =
      decision === 'reject' &&
      (body.next_step === 'revise_same_supplier' || body.next_step === 'different_supplier')
        ? body.next_step
        : null;

    const now = new Date().toISOString();
    const newStatus = decision === 'approve' ? 'approved' : 'rejected';

    // Atomic first-wins: only succeed if still pending
    const { data: decided, error } = await auth.supabase
      .from('service_call_quotes')
      .update({
        status: newStatus,
        decision_by: auth.userId,
        decision_at: now,
        decision_reason: body.reason?.trim() || null,
        next_step,
        updated_at: now,
      })
      .eq('id', quoteId)
      .eq('service_call_id', id)
      .eq('status', 'pending')
      .select('*')
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!decided) {
      return NextResponse.json(
        {
          error: 'Quote already decided by someone else. Refresh and continue from the latest state.',
          code: 'QUOTE_ALREADY_DECIDED',
        },
        { status: 409 }
      );
    }

    const scUpdate: Record<string, unknown> = {};
    if (decision === 'approve') {
      scUpdate.technical_status =
        current.technical_status === 'awaiting_parts_quote_escalation'
          ? 'repair_and_testing'
          : current.technical_status;
      scUpdate.quotation_required = false;
    } else {
      scUpdate.quotation_notes = body.reason?.trim() || current.quotation_notes;
    }

    if (Object.keys(scUpdate).length) {
      await auth.supabase.from('service_calls').update(scUpdate).eq('id', id);
    }

    await writeServiceCallAudit(auth.supabase, {
      service_call_id: id,
      action: decision === 'approve' ? 'quote_approved' : 'quote_rejected',
      actor_id: auth.userId,
      from_technical_status: current.technical_status,
      to_technical_status: (scUpdate.technical_status as string) || current.technical_status,
      reason: body.reason?.trim() || null,
      payload_json: { quote_id: quoteId, next_step },
    });

    const admins = await listAdminIds(auth.supabase);
    await notifyServiceCallUsers(auth.supabase, {
      userIds: [...admins, current.coordinator_id, current.assigned_technician_id],
      type: 'service_call_quote_decided',
      title: `Quote ${decision}d: ${current.service_call_number}`,
      message:
        decision === 'reject'
          ? body.reason?.trim() || 'Quote rejected'
          : `Supplier quote approved (rev ${decided.revision})`,
      ticket_id: current.ticket_id,
      triggering_user_id: auth.userId,
      triggering_user_role: auth.isAdmin ? 'admin' : 'member',
    });

    return NextResponse.json({ quote: decided });
  } catch (err) {
    logSafeError('POST quote decide', err);
    return NextResponse.json({ error: getSafeErrorMessage(err) }, { status: 500 });
  }
}
