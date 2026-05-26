import { NextRequest, NextResponse } from 'next/server';
import { ensureCalloutAdmin, getCalloutServiceClient } from '@/app/lib/callouts/auth';
import { jsonError } from '@/app/lib/callouts/api-response';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';

export async function GET(request: NextRequest) {
  const auth = await ensureCalloutAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { searchParams } = new URL(request.url);
  const contractorId = searchParams.get('contractorId');
  const format = searchParams.get('format') || 'json';

  const admin = getCalloutServiceClient();
  let query = admin
    .from('callout_records')
    .select(
      'id, status, primary_job_card_number, primary_site_name, service_date, total_billed, compliance_score, ai_summary, fault_classification, contractors(name, code)',
    )
    .order('updated_at', { ascending: false })
    .limit(5000);

  if (contractorId) query = query.eq('contractor_id', contractorId);

  const { data, error } = await query;
  if (error) {
    logSafeError('callout export', error);
    return jsonError(getSafeErrorMessage(error), 500);
  }

  const rows = data ?? [];

  if (format === 'csv') {
    const headers = [
      'id',
      'contractor',
      'status',
      'job_card_number',
      'site',
      'service_date',
      'total_billed',
      'compliance_score',
    ];
    const lines = [
      headers.join(','),
      ...rows.map((r) => {
        const c = r.contractors as { name?: string };
        return [
          r.id,
          `"${(c?.name ?? '').replace(/"/g, '""')}"`,
          r.status,
          r.primary_job_card_number ?? '',
          `"${(r.primary_site_name ?? '').replace(/"/g, '""')}"`,
          r.service_date ?? '',
          r.total_billed ?? '',
          r.compliance_score ?? '',
        ].join(',');
      }),
    ];
    return new NextResponse(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="callout-records.csv"',
      },
    });
  }

  return NextResponse.json({ exportedAt: new Date().toISOString(), records: rows });
}
