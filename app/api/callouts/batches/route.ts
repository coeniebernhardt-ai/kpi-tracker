import { NextRequest, NextResponse } from 'next/server';
import { ensureCalloutAdmin, getCalloutServiceClient } from '@/app/lib/callouts/auth';
import { jsonError } from '@/app/lib/callouts/api-response';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';

export async function POST(request: NextRequest) {
  const auth = await ensureCalloutAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = await request.json();
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const contractorId = body.contractorId as string | undefined;
  if (!name || !contractorId) return jsonError('name and contractorId required', 400);

  const admin = getCalloutServiceClient();
  const { data, error } = await admin
    .from('callout_upload_batches')
    .insert({
      name,
      contractor_id: contractorId,
      status: 'pending',
      created_by: auth.userId,
    })
    .select()
    .single();

  if (error) {
    logSafeError('callout batch create', error);
    return jsonError(getSafeErrorMessage(error), 500);
  }
  return NextResponse.json({ batch: data }, { status: 201 });
}
