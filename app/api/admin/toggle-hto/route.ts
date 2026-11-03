import { NextRequest, NextResponse } from 'next/server';
import { requireSupportCallUser } from '@/app/lib/support-calls/auth';
import { handleRouteError, isUuid, jsonError, readJson } from '@/app/lib/support-calls/server';

/** PATCH /api/admin/toggle-hto { userId, is_hto } — ADMIN ONLY (HTOs cannot grant HTO). */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireSupportCallUser(request);
    if (!auth.ok) return jsonError(auth.error, auth.status);
    if (!auth.isAdmin) return jsonError('Only admins can change HTO status', 403);

    const body = await readJson(request);
    if (!isUuid(body.userId)) return jsonError('userId is required', 400);
    if (typeof body.is_hto !== 'boolean') return jsonError('is_hto must be a boolean', 400);

    const { data: target } = await auth.supabase
      .from('profiles')
      .select('id, full_name, is_hto, is_active')
      .eq('id', body.userId)
      .maybeSingle();
    if (!target) return jsonError('User not found', 404);

    if (body.is_hto === false && target.is_hto) {
      // Do not orphan open support calls owned by this HTO.
      const { count } = await auth.supabase
        .from('support_calls')
        .select('*', { count: 'exact', head: true })
        .eq('hto_owner_id', body.userId)
        .eq('overall_status', 'open');
      if ((count || 0) > 0) {
        return jsonError(
          `This HTO still owns ${count} open support call(s). Reassign or close them before removing HTO status.`,
          409,
          { code: 'HTO_OWNS_OPEN_CALLS', open_count: count }
        );
      }
    }
    if (body.is_hto === true && target.is_active === false) {
      return jsonError('Cannot grant HTO to an inactive account', 409);
    }

    const { data: updated, error } = await auth.supabase
      .from('profiles')
      .update({ is_hto: body.is_hto })
      .eq('id', body.userId)
      .select('id, full_name, is_hto')
      .single();
    if (error) return jsonError(error.message, 500);

    // support_call_audit_events requires a support_call_id, so this global change is logged server-side.
    console.info('[support-calls] HTO toggled', { target: body.userId, is_hto: body.is_hto, by: auth.userId });

    return NextResponse.json({ profile: updated });
  } catch (e) {
    return handleRouteError('PATCH /admin/toggle-hto', e);
  }
}
