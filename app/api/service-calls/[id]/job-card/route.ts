import { NextRequest, NextResponse } from 'next/server';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';
import { canAccessServiceCallRow, requireServiceCallUser } from '@/app/lib/service-calls/auth';
import { writeServiceCallAudit } from '@/app/lib/service-calls/audit';
import { validateJobCardForSubmit } from '@/app/lib/service-calls/job-card';
import { notifyServiceCallUsers } from '@/app/lib/service-calls/notify';
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
    const draft = body.save_as_draft === true;
    const cardFields = {
      diagnosis: body.diagnosis ?? null,
      work_performed: body.work_performed ?? null,
      labour_minutes: body.labour_minutes ?? null,
      parts_used: body.parts_used ?? [],
      parts_none: body.parts_none === true,
      test_results: body.test_results ?? null,
      evidence_notes: body.evidence_notes ?? null,
      evidence_exception: body.evidence_exception ?? null,
      customer_signoff_obtained: body.customer_signoff_obtained ?? null,
      customer_signoff_notes: body.customer_signoff_notes ?? null,
      signoff_exception: body.signoff_exception ?? null,
    };

    if (!draft) {
      const validation = validateJobCardForSubmit(cardFields);
      if (!validation.ok) {
        return NextResponse.json(
          { error: 'Job card incomplete', missing: validation.missing },
          { status: 400 }
        );
      }
    }

    const { data: existing } = await auth.supabase
      .from('service_call_job_cards')
      .select('id')
      .eq('service_call_id', id)
      .in('status', ['draft', 'returned', 'submitted'])
      .order('created_at', { ascending: false })
      .limit(1);

    const status = draft ? 'draft' : 'submitted';
    const row = {
      ...cardFields,
      status,
      submitted_by: auth.userId,
      submitted_at: draft ? null : new Date().toISOString(),
      correction_notes: null,
      service_call_id: id,
    };

    let jobCard;
    if (existing?.[0]?.id) {
      const { data, error } = await auth.supabase
        .from('service_call_job_cards')
        .update(row)
        .eq('id', existing[0].id)
        .select('*')
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      jobCard = data;
    } else {
      const { data, error } = await auth.supabase
        .from('service_call_job_cards')
        .insert(row)
        .select('*')
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      jobCard = data;
    }

    if (!draft) {
      await auth.supabase
        .from('service_calls')
        .update({ technical_status: 'job_card_required' })
        .eq('id', id);

      await writeServiceCallAudit(auth.supabase, {
        service_call_id: id,
        action: 'job_card_submitted',
        actor_id: auth.userId,
        from_technical_status: current.technical_status,
        to_technical_status: 'job_card_required',
      });

      await notifyServiceCallUsers(auth.supabase, {
        userIds: [current.coordinator_id, current.created_by],
        type: 'service_call_job_card_submitted',
        title: `Job card submitted: ${current.service_call_number}`,
        message: current.title,
        ticket_id: current.ticket_id,
        triggering_user_id: auth.userId,
        triggering_user_role: auth.isAdmin ? 'admin' : 'member',
      });
    }

    return NextResponse.json({ jobCard });
  } catch (err) {
    logSafeError('POST job-card', err);
    return NextResponse.json({ error: getSafeErrorMessage(err) }, { status: 500 });
  }
}
