import { NextRequest, NextResponse } from 'next/server';
import {
  dbError,
  handleRouteError,
  jsonError,
  loadSupportCallBundle,
  priorityToSeverity,
  readJson,
  recomputeWorkflowStage,
  scContext,
  type RouteCtx,
} from '@/app/lib/support-calls/server';
import { parseIntake } from '@/app/lib/support-calls/intake';
import { findDuplicateSupportCalls } from '@/app/lib/support-calls/duplicates';

/** GET /api/support-calls/[id] — bundled detail. Managers: everything; assignees: a trimmed view. */
export async function GET(request: NextRequest, { params }: RouteCtx) {
  try {
    const { id } = await params;
    const ctx = await scContext(request, id, 'read');
    if (!ctx.ok) return ctx.response;
    const bundle = await loadSupportCallBundle(ctx.auth.supabase, ctx.sc, {
      manage: ctx.auth.canManage,
      userId: ctx.auth.userId,
    });
    return NextResponse.json(bundle);
  } catch (e) {
    return handleRouteError('GET /support-calls/[id]', e);
  }
}

/** PATCH /api/support-calls/[id] — managers update intake / site / responsible person / priority / refs. */
export async function PATCH(request: NextRequest, { params }: RouteCtx) {
  try {
    const { id } = await params;
    const ctx = await scContext(request, id, 'manager', { requireOpen: true });
    if (!ctx.ok) return ctx.response;
    const { auth, sc } = ctx;
    const body = await readJson(request);

    if ('original_description' in body) {
      return jsonError('original_description is immutable; add notes via operational_description', 400);
    }

    const { values, error } = parseIntake(body);
    if (error) return jsonError(error, 400);
    if (!Object.keys(values).length) return jsonError('No updatable fields supplied', 400);
    if ('client' in values && !values.client) return jsonError('client cannot be empty', 400);

    // Reference changes: block exact duplicates with a clear message before the DB unique index does.
    const refKeys = ['supplier_invoice_number', 'third_party_job_card_number', 'po_number', 'external_quote_reference'];
    if (refKeys.some((k) => k in values)) {
      const dup = await findDuplicateSupportCalls(auth.supabase, {
        supplier_invoice_number: (values.supplier_invoice_number as string | null | undefined) ?? undefined,
        third_party_job_card_number: (values.third_party_job_card_number as string | null | undefined) ?? undefined,
        po_number: (values.po_number as string | null | undefined) ?? undefined,
        external_quote_reference: (values.external_quote_reference as string | null | undefined) ?? undefined,
        exclude_id: sc.id,
      });
      if (dup.exactMatch) {
        return jsonError(dup.safeHint || 'Duplicate reference', 409, { code: 'DUPLICATE', duplicates: dup });
      }
    }

    const previous: Record<string, unknown> = {};
    const changed: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(values)) {
      const prev = (sc as unknown as Record<string, unknown>)[k] ?? null;
      if (JSON.stringify(prev) !== JSON.stringify(val ?? null)) {
        previous[k] = prev;
        changed[k] = val;
      }
    }
    if (!Object.keys(changed).length) {
      return NextResponse.json({ support_call: sc, unchanged: true });
    }

    const { data: updated, error: upErr } = await auth.supabase
      .from('support_calls')
      .update(changed)
      .eq('id', sc.id)
      .select('*')
      .single();
    if (upErr) return dbError('patch', upErr);

    if (changed.priority) {
      await auth.supabase
        .from('tickets')
        .update({ severity: priorityToSeverity(changed.priority as 'Critical' | 'High' | 'Medium' | 'Low') })
        .eq('id', sc.ticket_id);
    }

    await ctx.audit('support_call_updated', { previous_value: previous, new_value: changed });
    await recomputeWorkflowStage(auth.supabase, sc.id);

    return NextResponse.json({ support_call: updated });
  } catch (e) {
    return handleRouteError('PATCH /support-calls/[id]', e);
  }
}
