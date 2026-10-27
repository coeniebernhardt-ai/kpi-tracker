import { NextRequest, NextResponse } from 'next/server';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';
import { requireServiceCallUser } from '@/app/lib/service-calls/auth';
import { TERMINAL_TECHNICAL } from '@/app/lib/service-calls/types';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireServiceCallUser(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = request.nextUrl;
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let query = auth.supabase
      .from('service_calls')
      .select(
        'id, technical_status, invoicing_status, priority, assigned_technician_id, remote_fix_possible, created_at, acknowledged_at, assigned_at, resolved_at, ready_to_invoice_at, closed_at'
      );
    if (!auth.isAdmin) {
      query = query.or(
        `created_by.eq.${auth.userId},reported_by.eq.${auth.userId},coordinator_id.eq.${auth.userId},assigned_technician_id.eq.${auth.userId}`
      );
    }
    if (from) query = query.gte('created_at', `${from}T00:00:00.000Z`);
    if (to) query = query.lte('created_at', `${to}T23:59:59.999Z`);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const rows = data ?? [];

    const byTechnical: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let open = 0;
    let unassigned = 0;
    let awaitingAcceptance = 0;
    let awaitingParts = 0;
    let jobCardCorrection = 0;
    let readyToInvoice = 0;
    let remoteResolved = 0;
    let closed = 0;
    let ackSum = 0;
    let ackCount = 0;
    let assignSum = 0;
    let assignCount = 0;
    let resolveSum = 0;
    let resolveCount = 0;
    let invoiceIssued = 0;
    let paymentOutstanding = 0;
    let disputed = 0;

    for (const r of rows) {
      byTechnical[r.technical_status] = (byTechnical[r.technical_status] || 0) + 1;
      byPriority[r.priority] = (byPriority[r.priority] || 0) + 1;
      if (!TERMINAL_TECHNICAL.includes(r.technical_status)) open++;
      if (!r.assigned_technician_id && !TERMINAL_TECHNICAL.includes(r.technical_status)) unassigned++;
      if (r.technical_status === 'awaiting_acceptance') awaitingAcceptance++;
      if (r.technical_status === 'awaiting_parts_quote_escalation') awaitingParts++;
      if (r.technical_status === 'job_card_correction_required') jobCardCorrection++;
      if (r.technical_status === 'ready_to_invoice' || r.invoicing_status === 'ready_to_invoice') {
        readyToInvoice++;
      }
      if (r.technical_status === 'remote_resolution' || r.remote_fix_possible === true) remoteResolved++;
      if (r.technical_status === 'closed') closed++;
      if (r.invoicing_status === 'invoice_issued' || r.invoicing_status === 'payment_outstanding' || r.invoicing_status === 'paid' || r.invoicing_status === 'partially_paid') {
        invoiceIssued++;
      }
      if (r.invoicing_status === 'payment_outstanding' || r.invoicing_status === 'partially_paid') paymentOutstanding++;
      if (r.invoicing_status === 'disputed') disputed++;

      if (r.acknowledged_at && r.created_at) {
        ackSum += (new Date(r.acknowledged_at).getTime() - new Date(r.created_at).getTime()) / 60000;
        ackCount++;
      }
      if (r.assigned_at && r.created_at) {
        assignSum += (new Date(r.assigned_at).getTime() - new Date(r.created_at).getTime()) / 60000;
        assignCount++;
      }
      if (r.resolved_at && r.created_at) {
        resolveSum += (new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime()) / 60000;
        resolveCount++;
      }
    }

    const total = rows.length;
    return NextResponse.json({
      total,
      open,
      byTechnical,
      byPriority,
      unassigned,
      awaitingAcceptance,
      awaitingParts,
      jobCardCorrection,
      readyToInvoice,
      remoteResolutionRate: total ? Math.round((remoteResolved / total) * 1000) / 10 : null,
      firstVisitResolutionRate: null,
      returnVisitRate: null,
      avgAckMinutes: ackCount ? Math.round(ackSum / ackCount) : null,
      avgAssignMinutes: assignCount ? Math.round(assignSum / assignCount) : null,
      avgResolveMinutes: resolveCount ? Math.round(resolveSum / resolveCount) : null,
      invoiceIssued,
      paymentOutstanding,
      disputed,
      closed,
    });
  } catch (err) {
    logSafeError('GET metrics', err);
    return NextResponse.json({ error: getSafeErrorMessage(err) }, { status: 500 });
  }
}
