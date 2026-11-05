import { NextRequest, NextResponse } from 'next/server';
import {
  cleanStr,
  dbError,
  handleRouteError,
  jsonError,
  notifyRole,
  readJson,
  recomputeWorkflowStage,
  scContext,
  type RouteCtx,
} from '@/app/lib/support-calls/server';
import { notifySupportCallUsers } from '@/app/lib/support-calls/notify';

/**
 * POST /api/support-calls/[id]/contributions
 * COMPLETE MY WORK: submit technical summary + mark assignment work_completed_at.
 * Optional partner referral: referred_to_partner + referral_reason → ticket Pending / HTO.
 * HTO approval is NOT required for completion.
 */
export async function POST(request: NextRequest, { params }: RouteCtx) {
  try {
    const { id } = await params;
    const ctx = await scContext(request, id, 'manager_or_assignee', { requireOpen: true });
    if (!ctx.ok) return ctx.response;
    const { auth, sc, assignment } = ctx;
    const supabase = auth.supabase;

    if (!assignment) {
      return jsonError(
        'You cannot complete work on this support call because you are not an assigned technician. Ask the HTO to assign you first.',
        403
      );
    }

    if ((assignment as { work_completed_at?: string | null }).work_completed_at) {
      return jsonError(
        'Your work is already marked complete. If HTO requested a correction, wait for the return before submitting again.',
        409
      );
    }

    const body = await readJson(request);
    const summary = cleanStr(body.summary, 20000);
    if (!summary) {
      return jsonError(
        'Complete My Work cannot continue. Enter a summary of your investigation and work performed.',
        400
      );
    }
    if (body.confirmed_accurate !== true) {
      return jsonError(
        'Complete My Work cannot continue. Tick the confirmation that your technical work (visits and hardware) is accurate.',
        400
      );
    }

    const referred = body.referred_to_partner === true || body.unable_to_complete_partner_required === true;
    const referral_reason = cleanStr(body.referral_reason, 5000);
    if (referred && !referral_reason) {
      return jsonError(
        'Support Partner referral cannot be submitted. Provide a short reason explaining why external specialist assistance is required.',
        400
      );
    }

    const { data: visits } = await supabase
      .from('support_call_visits')
      .select('id, arrived_at, departed_at, work_performed')
      .eq('support_call_id', sc.id)
      .eq('assignment_id', assignment.id)
      .eq('party_type', 'internal');
    const validVisits = (visits || []).filter(
      (v: { arrived_at: string | null; departed_at: string | null }) => v.arrived_at && v.departed_at
    );
    if (!validVisits.length) {
      return jsonError(
        'Complete My Work cannot continue. Log at least one visit with both arrival and departure times for your assignment first.',
        400
      );
    }

    const payload_json =
      body.payload_json && typeof body.payload_json === 'object' && !Array.isArray(body.payload_json)
        ? body.payload_json
        : {};

    const { data: latestRows } = await supabase
      .from('support_call_contributions')
      .select('*')
      .eq('assignment_id', assignment.id)
      .order('revision', { ascending: false })
      .limit(1);
    const latest = latestRows?.[0] as { id: string; revision: number; status: string } | undefined;

    if (latest?.status === 'submitted' || latest?.status === 'approved') {
      return jsonError('Your work is already submitted and counted as complete.', 409);
    }

    const now = new Date().toISOString();
    const completion_category = referred ? 'completed_referred_to_partner' : 'completed';
    const common = {
      summary,
      confirmed_accurate: true,
      correction_notes: cleanStr(body.correction_notes, 5000),
      payload_json,
      status: 'submitted',
      submitted_at: now,
      referred_to_partner: referred,
      referral_reason: referred ? referral_reason : null,
      completion_category,
    };

    let contribution: Record<string, unknown> | null = null;
    if (latest?.status === 'draft') {
      const { data, error } = await supabase
        .from('support_call_contributions')
        .update(common)
        .eq('id', latest.id)
        .eq('status', 'draft')
        .select('*')
        .single();
      if (error) return dbError('contributions.update', error);
      contribution = data;
    } else {
      const { data, error } = await supabase
        .from('support_call_contributions')
        .insert({
          ...common,
          support_call_id: sc.id,
          assignment_id: assignment.id,
          revision: (latest?.revision ?? 0) + 1,
        })
        .select('*')
        .single();
      if (error) return dbError('contributions.create', error);
      contribution = data;
    }

    const { error: doneErr } = await supabase
      .from('support_call_assignments')
      .update({
        work_completed_at: now,
        work_completed_by: auth.userId,
        first_submitted_at: assignment.first_submitted_at ?? now,
        first_update_at: assignment.first_update_at ?? now,
        referred_to_partner: referred,
        referral_reason: referred ? referral_reason : null,
        completion_category,
      })
      .eq('id', assignment.id);
    if (doneErr) return dbError('assignments.complete', doneErr);

    if (referred) {
      await supabase
        .from('support_calls')
        .update({
          partner_required: true,
          partner_required_at: now,
          partner_required_by: auth.userId,
          partner_required_reason: referral_reason,
        })
        .eq('id', sc.id);

      if (sc.ticket_id) {
        await supabase
          .from('tickets')
          .update({
            status: 'pending',
            assigned_to_array: [sc.hto_owner_id],
            user_id: sc.hto_owner_id,
          })
          .eq('id', sc.ticket_id);
      }
    }

    await ctx.audit(referred ? 'member_work_referred_partner' : 'member_work_completed', {
      related_id: contribution!.id as string,
      new_value: {
        revision: contribution!.revision,
        status: 'submitted',
        work_completed_at: now,
        completion_category,
        referred_to_partner: referred,
        referral_reason: referred ? referral_reason : null,
      },
    });

    await notifySupportCallUsers(supabase, {
      userIds: [sc.hto_owner_id].filter((u) => u !== auth.userId),
      type: referred ? 'support_call_attention' : 'support_call_contribution_submitted',
      title: referred
        ? `SUPPORT PARTNER REQUIRED — ${sc.support_call_number}`
        : `Work completed on ${sc.support_call_number}`,
      message: referred
        ? `Technician referred to external support partner: ${referral_reason}`
        : 'A team member completed their technical work.',
      ticket_id: sc.ticket_id,
      triggering_user_id: auth.userId,
      triggering_user_role: notifyRole(auth),
    });

    const stage = await recomputeWorkflowStage(supabase, sc.id);
    return NextResponse.json(
      {
        contribution,
        assignment: {
          id: assignment.id,
          work_completed_at: now,
          completion_category,
          referred_to_partner: referred,
        },
        workflow: stage,
      },
      { status: 201 }
    );
  } catch (e) {
    return handleRouteError('POST /support-calls/[id]/contributions', e);
  }
}
