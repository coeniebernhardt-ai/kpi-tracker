import { NextRequest, NextResponse } from 'next/server';
import { ensureCalloutAdmin, getCalloutServiceClient } from '@/app/lib/callouts/auth';
import { jsonError } from '@/app/lib/callouts/api-response';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';

export async function GET(request: NextRequest) {
  const auth = await ensureCalloutAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { searchParams } = new URL(request.url);
  const contractorId = searchParams.get('contractorId');

  const admin = getCalloutServiceClient();

  let recordsQ = admin.from('callout_records').select('*', { count: 'exact', head: true });
  let flagsQ = admin.from('callout_flags').select('*', { count: 'exact', head: true }).eq('status', 'open');
  let docsQ = admin.from('callout_documents').select('*', { count: 'exact', head: true });
  let needsReviewQ = admin.from('callout_records').select('*', { count: 'exact', head: true }).eq('status', 'needs_review');
  let failedDocsQ = admin.from('callout_documents').select('*', { count: 'exact', head: true }).eq('processing_status', 'failed');

  if (contractorId) {
    recordsQ = recordsQ.eq('contractor_id', contractorId);
    docsQ = docsQ.eq('contractor_id', contractorId);
    needsReviewQ = needsReviewQ.eq('contractor_id', contractorId);
    failedDocsQ = failedDocsQ.eq('contractor_id', contractorId);
  }

  const [records, openFlags, documents, needsReview, failedDocs] = await Promise.all([
    recordsQ,
    flagsQ,
    docsQ,
    needsReviewQ,
    failedDocsQ,
  ]);

  const { data: byContractor } = await admin
    .from('callout_records')
    .select('contractor_id, total_billed, compliance_score, contractors(name, code)');

  const supplierMap: Record<string, { name: string; count: number; totalBilled: number; avgCompliance: number }> = {};
  for (const row of byContractor ?? []) {
    const cid = row.contractor_id as string;
    const name = (row.contractors as { name?: string })?.name ?? cid;
    if (!supplierMap[cid]) supplierMap[cid] = { name, count: 0, totalBilled: 0, avgCompliance: 0 };
    supplierMap[cid].count += 1;
    supplierMap[cid].totalBilled += Number(row.total_billed) || 0;
    supplierMap[cid].avgCompliance += Number(row.compliance_score) || 0;
  }
  const suppliers = Object.entries(supplierMap).map(([id, s]) => ({
    contractorId: id,
    ...s,
    avgCompliance: s.count ? Math.round(s.avgCompliance / s.count) : 0,
  }));

  const { data: flagTypes } = await admin.from('callout_flags').select('flag_type').eq('status', 'open');

  const flagBreakdown: Record<string, number> = {};
  for (const f of flagTypes ?? []) {
    flagBreakdown[f.flag_type] = (flagBreakdown[f.flag_type] ?? 0) + 1;
  }

  return NextResponse.json({
    totals: {
      records: records.count ?? 0,
      openFlags: openFlags.count ?? 0,
      documents: documents.count ?? 0,
      needsReview: needsReview.count ?? 0,
      failedDocuments: failedDocs.count ?? 0,
    },
    suppliers,
    flagBreakdown,
  });
}
