import { NextRequest, NextResponse } from 'next/server';
import {
  cleanNum,
  cleanStr,
  dbError,
  handleRouteError,
  isUuid,
  jsonError,
  readJson,
  scContext,
  type RouteCtx,
} from '@/app/lib/support-calls/server';

/**
 * POST /api/support-calls/[id]/hardware
 * Body: a single line { description, ... } OR { items: [...], visit_id? }.
 * Managers or assignees.
 */
export async function POST(request: NextRequest, { params }: RouteCtx) {
  try {
    const { id } = await params;
    const ctx = await scContext(request, id, 'manager_or_assignee', { requireOpen: true });
    if (!ctx.ok) return ctx.response;
    const { auth, sc } = ctx;
    const body = await readJson(request);

    const rawItems: Record<string, unknown>[] = Array.isArray(body.items)
      ? (body.items as Record<string, unknown>[])
      : [body];
    if (!rawItems.length || rawItems.length > 100) return jsonError('Provide 1–100 hardware lines', 400);

    const defaultVisit = isUuid(body.visit_id) ? body.visit_id : null;
    const visitIds = new Set<string>();
    const rows: Record<string, unknown>[] = [];

    for (const [i, item] of rawItems.entries()) {
      const description = cleanStr(item.description, 500);
      if (!description) {
        return jsonError(
          `Hardware line ${i + 1} cannot be saved. Enter a description (for example: Hikvision reader, network cable).`,
          400
        );
      }
      const qty = cleanNum(item.quantity) ?? 1;
      if (qty <= 0) {
        return jsonError(`Hardware line ${i + 1} cannot be saved. Quantity must be greater than zero.`, 400);
      }
      const visit_id = isUuid(item.visit_id) ? item.visit_id : defaultVisit;
      if (!visit_id) {
        return jsonError(
          `Hardware line ${i + 1} cannot be saved. Select the visit this stock was used on.`,
          400
        );
      }
      visitIds.add(visit_id);
      const mac = cleanStr(item.mac ?? item.new_mac ?? item.old_mac, 50);
      // Only include columns that exist on support_call_hardware_items.
      // document_id is optional (V4+) — omit when unset so older DBs still accept inserts.
      const row: Record<string, unknown> = {
        support_call_id: sc.id,
        visit_id,
        description,
        make_model: cleanStr(item.make_model, 200),
        quantity: qty,
        old_equipment: cleanStr(item.old_equipment, 300),
        new_equipment: cleanStr(item.new_equipment, 300),
        old_mac: cleanStr(item.old_mac, 50),
        new_mac: mac,
        serial_number: cleanStr(item.serial_number, 100),
        replacement_reason: cleanStr(item.replacement_reason, 1000),
        created_by: auth.userId,
      };
      if (isUuid(item.document_id)) row.document_id = item.document_id;
      rows.push(row);
    }

    if (visitIds.size) {
      const { data: visits } = await auth.supabase
        .from('support_call_visits')
        .select('id')
        .eq('support_call_id', sc.id)
        .in('id', [...visitIds]);
      if ((visits || []).length !== visitIds.size) {
        return jsonError(
          'Hardware cannot be saved. The selected visit does not belong to this support call. Refresh and choose a visit again.',
          400
        );
      }
    }

    const { data, error } = await auth.supabase.from('support_call_hardware_items').insert(rows).select('*');
    if (error) return dbError('hardware', error);

    await ctx.audit('hardware_recorded', {
      related_id: data?.[0]?.id ?? null,
      new_value: (data || []).map((d: Record<string, unknown>) => ({
        id: d.id,
        description: d.description,
        quantity: d.quantity,
        visit_id: d.visit_id,
      })),
    });

    return NextResponse.json({ hardware_items: data || [] }, { status: 201 });
  } catch (e) {
    return handleRouteError('POST /support-calls/[id]/hardware', e);
  }
}
