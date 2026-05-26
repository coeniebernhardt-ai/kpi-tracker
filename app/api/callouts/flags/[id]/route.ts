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

  const { id } = await params;
  const body = await request.json();
  const status = body.status as string;
  if (!['approved', 'rejected', 'false_positive'].includes(status)) {
    return jsonError('Invalid flag status', 400);
  }

  const admin = getCalloutServiceClient();
  const { data, error } = await admin
    .from('callout_flags')
    .update({
      status,
      reviewed_by: auth.userId,
      reviewed_at: new Date().toISOString(),
      review_note: body.reviewNote ?? null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logSafeError('callout flag patch', error);
    return jsonError(getSafeErrorMessage(error), 500);
  }

  await writeCalloutAudit(admin, {
    entityType: 'flag',
    entityId: id,
    action: 'flag.reviewed',
    payload: { status, review_note: body.reviewNote },
    userId: auth.userId,
  });

  return NextResponse.json({ flag: data });
}
