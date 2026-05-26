import { NextRequest, NextResponse } from 'next/server';
import { ensureCalloutAdmin, getCalloutServiceClient } from '@/app/lib/callouts/auth';
import { jsonError } from '@/app/lib/callouts/api-response';
import { writeCalloutAudit } from '@/app/lib/callouts/audit';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await ensureCalloutAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { id } = await params;
  const admin = getCalloutServiceClient();

  const { data: suggestion } = await admin
    .from('callout_link_suggestions')
    .select('*')
    .eq('id', id)
    .single();

  if (!suggestion) return jsonError('Suggestion not found', 404);

  await admin
    .from('callout_documents')
    .update({ callout_record_id: suggestion.suggested_callout_record_id })
    .eq('id', suggestion.document_id);

  await admin
    .from('callout_link_suggestions')
    .update({
      status: 'accepted',
      reviewed_by: auth.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id);

  await writeCalloutAudit(admin, {
    entityType: 'link_suggestion',
    entityId: id,
    action: 'link.suggestion_accepted',
    payload: suggestion,
    userId: auth.userId,
  });

  return NextResponse.json({ ok: true });
}
