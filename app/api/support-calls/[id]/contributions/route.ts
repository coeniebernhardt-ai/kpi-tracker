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
 * HTO approval is NOT required for completion. HTO may later Request correction (return).
 */
export async function POST(request: NextRequest, { params }: RouteCtx) {
  try {
    const { id } = await params;
    const ctx = await scContext(request, id, 'manager_or_assignee', { requireOpen: true });
    if (!ctx.ok) return ctx.response;
    const { auth, sc, assignment } = ctx;
    const supabase = auth.supabase;

    if (!assignment) {
      return jsonError('Only assigned team members can complete their work', 403);
    }

    if ((assignment as { work_completed_at?: string | null }).work_completed_at) {
      return jsonError('Your work is already marked complete', 409);
    }

    const body = await readJson(request);
    const summary = cleanStr(body.summary, 20000);
    if (!summary) return jsonError('A summary of your work is required', 400);
    if (body.confirmed_accurate !== true) {
      return jsonError('You must confirm that your technical work is accurate', 400);
    }

    // Require at least one internal visit with arrival/departure for this assignment
    const { data: visits } = await supabase
      .from('support_call_visits')
      .select('id, arrived_at, departed_at, work_performed')
      .eq('support_call_id', sc.id)
      .eq('assignment_id', assignment.id)
      .eq('party_type', 'internal');
    const validVisits = (visits || []).filter((v: { arrived_at: string | null; departed_at: string | null }) => v.arrived_at && v.departed_at);
    if (!validVisits.length) {
      return jsonError('Log at least one visit with arrival and departure times before completing your work', 400);
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
    const latest = latestRows?.[0] as
      | { id: string; revision: number; status: string }
      | undefined;

    if (latest?.status === 'submitted' || latest?.status === 'approved') {
      return jsonError('Your work is already submitted', 409);
    }

    const now = new Date().toISOString();
    const common = {
      summary,
      confirmed_accurate: true,
      correction_notes: cleanStr(body.correction_notes, 5000),
      payload_json,
      status: 'submitted',
      submitted_at: now,
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
      // draft missing, returned, or first submit — new revision preserves history
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
      })
      .eq('id', assignment.id);
    if (doneErr) return dbError('assignments.complete', doneErr);

    await ctx.audit('member_work_completed', {
      related_id: contribution!.id as string,
      new_value: {
        revision: contribution!.revision,
        status: 'submitted',
        work_completed_at: now,
        confirmed_accurate: true,
      },
    });

    await notifySupportCallUsers(supabase, {
      userIds: [sc.hto_owner_id].filter((u) => u !== auth.userId),
      type: 'support_call_contribution_submitted',
      title: `Work completed on ${sc.support_call_number}`,
      message: 'A team member completed their technical work.',
      ticket_id: sc.ticket_id,
      triggering_user_id: auth.userId,
      triggering_user_role: notifyRole(auth),
    });

    const stage = await recomputeWorkflowStage(supabase, sc.id);
    return NextResponse.json(
      {
        contribution,
        assignment: { id: assignment.id, work_completed_at: now },
        workflow: stage,
      },
      { status: 201 }
    );
  } catch (e) {
    return handleRouteError('POST /support-calls/[id]/contributions', e);
  }
}
