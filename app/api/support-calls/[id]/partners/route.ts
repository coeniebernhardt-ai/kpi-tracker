import { NextRequest, NextResponse } from 'next/server';
import {
  cleanStr,
  dbError,
  handleRouteError,
  isUuid,
  jsonError,
  readJson,
  recomputeWorkflowStage,
  scContext,
  type RouteCtx,
} from '@/app/lib/support-calls/server';

/**
 * POST /api/support-calls/[id]/partners — managers only.
 *  - { partner_id }                                   assign a directory partner (snapshot copied)
 *  - { once_off: true, company_name, ... }            assign a once-off partner (not saved to directory)
 *  - { action: 'confirm_arrival', partner_assignment_id }  confirm the partner has arrived
 */
export async function POST(request: NextRequest, { params }: RouteCtx) {
  try {
    const { id } = await params;
    const ctx = await scContext(request, id, 'manager', { requireOpen: true });
    if (!ctx.ok) return ctx.response;
    const { auth, sc } = ctx;
    const supabase = auth.supabase;
    const body = await readJson(request);

    const onsite = (sc as { onsite_location?: string | null }).onsite_location || sc.site_name;
    if (body.action !== 'confirm_arrival' && (!onsite || !String(onsite).trim())) {
      return jsonError('On-site location is required before dispatching a partner', 400);
    }

    if (body.action === 'confirm_arrival') {
      if (!isUuid(body.partner_assignment_id)) return jsonError('partner_assignment_id is required', 400);
      const { data, error } = await supabase
        .from('support_call_partners')
        .update({ arrival_confirmed_at: new Date().toISOString(), arrival_confirmed_by: auth.userId })
        .eq('id', body.partner_assignment_id)
        .eq('support_call_id', sc.id)
        .is('arrival_confirmed_at', null)
        .select('*')
        .maybeSingle();
      if (error) return dbError('partners.arrival', error);
      if (!data) return jsonError('Partner not found or arrival already confirmed', 409);
      await ctx.audit('partner_arrival_confirmed', { related_id: data.id, new_value: { company_name: data.company_name } });
      return NextResponse.json({ partner: data });
    }

    if (body.action === 'complete_work') {
      if (!isUuid(body.partner_assignment_id)) return jsonError('partner_assignment_id is required', 400);
      const { data, error } = await supabase
        .from('support_call_partners')
        .update({ work_completed_at: new Date().toISOString(), work_completed_by: auth.userId })
        .eq('id', body.partner_assignment_id)
        .eq('support_call_id', sc.id)
        .is('work_completed_at', null)
        .select('*')
        .maybeSingle();
      if (error) return dbError('partners.complete', error);
      if (!data) return jsonError('Partner not found or work already marked complete', 409);
      await ctx.audit('partner_work_completed', { related_id: data.id, new_value: { company_name: data.company_name } });
      await recomputeWorkflowStage(supabase, sc.id);
      return NextResponse.json({ partner: data });
    }

    let snapshot: Record<string, unknown>;
    let isOnceOff = false;

    if (isUuid(body.partner_id)) {
      const { data: partner } = await supabase
        .from('support_partners')
        .select('*')
        .eq('id', body.partner_id)
        .maybeSingle();
      if (!partner) return jsonError('Partner not found in directory', 404);
      if (partner.is_active === false) return jsonError('Partner is inactive', 409);
      snapshot = {
        partner_id: partner.id,
        company_name: partner.company_name,
        contact_person: partner.contact_person,
        email: partner.email,
        telephone: partner.telephone,
        category: partner.category,
        notes: cleanStr(body.notes, 2000) ?? partner.notes,
      };
    } else if (body.once_off === true) {
      const company_name = cleanStr(body.company_name, 200);
      if (!company_name) return jsonError('company_name is required for a once-off partner', 400);
      isOnceOff = true;
      snapshot = {
        partner_id: null,
        company_name,
        contact_person: cleanStr(body.contact_person, 200),
        email: cleanStr(body.email, 200),
        telephone: cleanStr(body.telephone, 50),
        category: cleanStr(body.category, 100),
        notes: cleanStr(body.notes, 2000),
      };
    } else {
      return jsonError('Provide partner_id (directory) or once_off: true with company details', 400);
    }

    if (snapshot.partner_id) {
      const { data: dup } = await supabase
        .from('support_call_partners')
        .select('id')
        .eq('support_call_id', sc.id)
        .eq('partner_id', snapshot.partner_id as string)
        .maybeSingle();
      if (dup) return jsonError('This partner is already assigned to the support call', 409);
    }

    const { data: row, error } = await supabase
      .from('support_call_partners')
      .insert({ ...snapshot, support_call_id: sc.id, is_once_off: isOnceOff, assigned_by: auth.userId })
      .select('*')
      .single();
    if (error) return dbError('partners.assign', error);

    await ctx.audit('partner_assigned', {
      related_id: row.id,
      new_value: { company_name: row.company_name, once_off: isOnceOff, partner_id: row.partner_id },
    });
    await recomputeWorkflowStage(supabase, sc.id);

    return NextResponse.json({ partner: row }, { status: 201 });
  } catch (e) {
    return handleRouteError('POST /support-calls/[id]/partners', e);
  }
}
