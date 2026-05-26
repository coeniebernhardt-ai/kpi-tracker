import { NextRequest, NextResponse } from 'next/server';
import { ensureCalloutAdmin, getCalloutServiceClient } from '@/app/lib/callouts/auth';
import { jsonError } from '@/app/lib/callouts/api-response';
import { writeCalloutAudit } from '@/app/lib/callouts/audit';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await ensureCalloutAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { id: documentId } = await params;
  const body = await request.json();
  const fieldKey = body.fieldKey as string;
  const newValue = body.value;
  const reason = (body.reason as string) || 'Manual correction';

  if (!fieldKey) return jsonError('fieldKey required', 400);

  const admin = getCalloutServiceClient();
  const { data: existing } = await admin
    .from('callout_field_values')
    .select('*')
    .eq('document_id', documentId)
    .eq('field_key', fieldKey)
    .maybeSingle();

  const oldPayload = existing
    ? { text: existing.value_text, numeric: existing.value_numeric, json: existing.value_json }
    : null;

  const valueText = typeof newValue === 'string' ? newValue : String(newValue ?? '');
  let valueNumeric: number | null = null;
  const n = parseFloat(valueText.replace(/[R,\s]/gi, ''));
  if (Number.isFinite(n)) valueNumeric = n;

  let fieldValueId = existing?.id;
  if (existing) {
    const { error } = await admin
      .from('callout_field_values')
      .update({
        value_text: valueText,
        value_numeric: valueNumeric,
        source: 'manual',
        updated_by: auth.userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
    if (error) return jsonError(getSafeErrorMessage(error), 500);
  } else {
    const { data: inserted, error } = await admin
      .from('callout_field_values')
      .insert({
        document_id: documentId,
        field_key: fieldKey,
        value_text: valueText,
        value_numeric: valueNumeric,
        source: 'manual',
        updated_by: auth.userId,
      })
      .select()
      .single();
    if (error) return jsonError(getSafeErrorMessage(error), 500);
    fieldValueId = inserted?.id;
  }

  if (fieldValueId) {
    await admin.from('callout_field_corrections').insert({
      field_value_id: fieldValueId,
      old_value: oldPayload,
      new_value: { text: valueText, numeric: valueNumeric },
      reason,
      user_id: auth.userId,
    });
  }

  await writeCalloutAudit(admin, {
    entityType: 'document',
    entityId: documentId,
    action: 'field.corrected',
    payload: { field_key: fieldKey, old: oldPayload, new: valueText, reason },
    userId: auth.userId,
  });

  return NextResponse.json({ ok: true });
}
