import { NextRequest, NextResponse } from 'next/server';
import { ensureCalloutAdmin, getCalloutServiceClient } from '@/app/lib/callouts/auth';
import { jsonError } from '@/app/lib/callouts/api-response';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await ensureCalloutAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { id: recordId } = await params;
  const body = await request.json();
  const text = typeof body.body === 'string' ? body.body.trim() : '';
  if (!text) return jsonError('body required', 400);

  const admin = getCalloutServiceClient();
  const { data, error } = await admin
    .from('callout_comments')
    .insert({
      callout_record_id: recordId,
      body: text,
      user_id: auth.userId,
      is_internal: body.isInternal !== false,
    })
    .select()
    .single();

  if (error) {
    logSafeError('callout comment', error);
    return jsonError(getSafeErrorMessage(error), 500);
  }
  return NextResponse.json({ comment: data }, { status: 201 });
}
