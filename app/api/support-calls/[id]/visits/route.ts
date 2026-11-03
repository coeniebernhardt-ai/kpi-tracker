import { NextRequest, NextResponse } from 'next/server';
import {
  cleanDate,
  cleanIso,
  cleanNum,
  cleanStr,
  dbError,
  handleRouteError,
  isUuid,
  jsonError,
  notifyRole,
  readJson,
  recomputeWorkflowStage,
  scContext,
  type RouteCtx,
} from '@/app/lib/support-calls/server';
import { minutesBetween, travelAmountZar } from '@/app/lib/support-calls/labour';
import { notifySupportCallUsers } from '@/app/lib/support-calls/notify';

export async function GET(request: NextRequest, { params }: RouteCtx) {
  try {
    const { id } = await params;
    const ctx = await scContext(request, id, 'read');
    if (!ctx.ok) return ctx.response;
    const { data, error } = await ctx.auth.supabase
      .from('support_call_visits')
      .select('*')
      .eq('support_call_id', ctx.sc.id)
      .order('visit_number', { ascending: true });
    if (error) return dbError('visits.list', error);
    const visits = (data || []).map((v: Record<string, unknown>) => {
      if (ctx.auth.canManage) return v;
      const { external_travel_cost_zar: _ext, ...rest } = v;
      void _ext;
      return rest;
    });
    return NextResponse.json({ visits });
  } catch (e) {
    return handleRouteError('GET /support-calls/[id]/visits', e);
  }
}

/**
 * POST /api/support-calls/[id]/visits
 * Internal visit: arrived_at + departed_at required. labour_minutes is computed from them and
 * travel_amount_zar = km x INTERNAL_TRAVEL_RATE_ZAR (R5.80). No labour fee is ever invented.
 * External visit (managers): partner_assignment_id required; external travel cost is recorded as supplied only.
 */
export async function POST(request: NextRequest, { params }: RouteCtx) {
  try {
    const { id } = await params;
    const ctx = await scContext(request, id, 'manager_or_assignee', { requireOpen: true });
    if (!ctx.ok) return ctx.response;
    const { auth, sc, assignment } = ctx;
    const supabase = auth.supabase;
    const body = await readJson(request);

    const party_type = body.party_type === 'external' ? 'external' : 'internal';
    if (party_type === 'external' && !auth.canManage) {
      return jsonError('Only admins and HTOs can record external partner visits', 403);
    }

    const arrived_at = cleanIso(body.arrived_at);
    const departed_at = cleanIso(body.departed_at);

    let assignmentId: string | null = null;
    let partnerAssignmentId: string | null = null;
    let labour_minutes: number | null = null;
    let travel_km: number | null = null;
    let travel_amount_zar: number | null = null;
    let external_travel_cost_zar: number | null = null;

    if (party_type === 'internal') {
      if (!arrived_at || !departed_at) {
        return jsonError('Internal visits require both arrival and departure times', 400);
      }
      labour_minutes = minutesBetween(arrived_at, departed_at);
      if (labour_minutes == null) return jsonError('Departure must be after arrival', 400);

      if (auth.canManage && isUuid(body.assignment_id)) {
        const { data } = await supabase
          .from('support_call_assignments')
          .select('id')
          .eq('id', body.assignment_id)
          .eq('support_call_id', sc.id)
          .maybeSingle();
        if (!data) return jsonError('assignment_id does not belong to this support call', 400);
        assignmentId = data.id;
      } else {
        assignmentId = assignment?.id ?? null;
      }
      if (!assignmentId) {
        return jsonError('Select the assigned team member this visit belongs to (assignment_id)', 400);
      }

      travel_km = cleanNum(body.travel_km);
      if (travel_km != null && travel_km < 0) return jsonError('travel_km cannot be negative', 400);
      travel_amount_zar = travel_km != null ? travelAmountZar(travel_km) : null;
    } else {
      if (!isUuid(body.partner_assignment_id)) {
        return jsonError('partner_assignment_id is required for external visits', 400);
      }
      const { data } = await supabase
        .from('support_call_partners')
        .select('id')
        .eq('id', body.partner_assignment_id)
        .eq('support_call_id', sc.id)
        .maybeSingle();
      if (!data) return jsonError('partner_assignment_id does not belong to this support call', 400);
      partnerAssignmentId = data.id;
      if (arrived_at && departed_at) {
        labour_minutes = minutesBetween(arrived_at, departed_at);
        if (labour_minutes == null) return jsonError('Departure must be after arrival', 400);
      }
      external_travel_cost_zar = cleanNum(body.external_travel_cost_zar);
      if (external_travel_cost_zar != null && external_travel_cost_zar < 0) {
        return jsonError('external_travel_cost_zar cannot be negative', 400);
      }
    }

    const incomplete = body.incomplete === true;
    const incomplete_reason = cleanStr(body.incomplete_reason, 2000);
    if (incomplete && !incomplete_reason) {
      return jsonError('Explain why the visit is incomplete (incomplete_reason)', 400);
    }

    const row = {
      support_call_id: sc.id,
      party_type,
      assignment_id: assignmentId,
      partner_assignment_id: partnerAssignmentId,
      visit_date: cleanDate(body.visit_date) ?? (arrived_at ? arrived_at.slice(0, 10) : new Date().toISOString().slice(0, 10)),
      arrived_at,
      departed_at,
      labour_minutes,
      travel_km,
      travel_amount_zar,
      external_travel_cost_zar,
      diagnosis: cleanStr(body.diagnosis, 10000),
      work_performed: cleanStr(body.work_performed, 10000),
      test_results: cleanStr(body.test_results, 10000),
      incomplete,
      incomplete_reason: incomplete ? incomplete_reason : null,
      dependency_notes: cleanStr(body.dependency_notes, 5000),
      expected_follow_up_date: cleanDate(body.expected_follow_up_date),
      next_action_party: cleanStr(body.next_action_party, 200),
      created_by: auth.userId,
    };

    // visit_number is unique per support call; retry on a concurrent insert.
    let visit: Record<string, unknown> | null = null;
    let lastErr: { message: string; code?: string } | null = null;
    for (let attempt = 0; attempt < 4 && !visit; attempt++) {
      const { data: last } = await supabase
        .from('support_call_visits')
        .select('visit_number')
        .eq('support_call_id', sc.id)
        .order('visit_number', { ascending: false })
        .limit(1);
      const visit_number = ((last?.[0]?.visit_number as number | undefined) ?? 0) + 1;
      const { data, error } = await supabase
        .from('support_call_visits')
        .insert({ ...row, visit_number })
        .select('*')
        .single();
      if (!error && data) visit = data;
      else {
        lastErr = error;
        if (error?.code !== '23505') break;
      }
    }
    if (!visit) return dbError('visits.create', lastErr || { message: 'Insert failed' });

    // Technician progress markers
    if (assignmentId) {
      const { data: a } = await supabase
        .from('support_call_assignments')
        .select('acknowledged_at, first_update_at')
        .eq('id', assignmentId)
        .maybeSingle();
      const patch: Record<string, string> = {};
      const now = new Date().toISOString();
      if (a && !a.first_update_at) patch.first_update_at = now;
      if (a && !a.acknowledged_at) patch.acknowledged_at = now;
      if (Object.keys(patch).length) {
        await supabase.from('support_call_assignments').update(patch).eq('id', assignmentId);
      }
    }

    await ctx.audit('visit_logged', {
      related_id: visit.id as string,
      new_value: {
        visit_number: visit.visit_number,
        party_type,
        labour_minutes,
        travel_km,
        travel_amount_zar,
        external_travel_cost_zar,
        incomplete,
      },
    });

    if (incomplete) {
      await notifySupportCallUsers(supabase, {
        userIds: [sc.hto_owner_id],
        type: 'support_call_dependency',
        title: `Visit incomplete on ${sc.support_call_number}`,
        message: incomplete_reason || 'A visit was logged as incomplete.',
        ticket_id: sc.ticket_id,
        triggering_user_id: auth.userId,
        triggering_user_role: notifyRole(auth),
      });
    }

    const stage = await recomputeWorkflowStage(supabase, sc.id);
    return NextResponse.json({ visit, workflow: stage }, { status: 201 });
  } catch (e) {
    return handleRouteError('POST /support-calls/[id]/visits', e);
  }
}
