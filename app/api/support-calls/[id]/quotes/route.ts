import { NextRequest, NextResponse } from 'next/server';
import {
  cleanDate,
  cleanNum,
  cleanStr,
  dbError,
  handleRouteError,
  isUuid,
  jsonError,
  readJson,
  recomputeWorkflowStage,
  scContext,
  type RouteCtx,
} from '@/app/lib/support-calls/server';

/** GET /api/support-calls/[id]/quotes — managers only. */
export async function GET(request: NextRequest, { params }: RouteCtx) {
  try {
    const { id } = await params;
    const ctx = await scContext(request, id, 'manager');
    if (!ctx.ok) return ctx.response;
    const { data, error } = await ctx.auth.supabase
      .from('support_call_quotes')
      .select('*')
      .eq('support_call_id', ctx.sc.id)
      .order('created_at', { ascending: true });
    if (error) return dbError('quotes.list', error);
    return NextResponse.json({ quotes: data || [] });
  } catch (e) {
    return handleRouteError('GET /support-calls/[id]/quotes', e);
  }
}

/**
 * POST /api/support-calls/[id]/quotes — managers only.
 * Records a quote. A new quote from the same supplier becomes the next revision and supersedes
 * any still-pending earlier revision.
 */
export async function POST(request: NextRequest, { params }: RouteCtx) {
  try {
    const { id } = await params;
    const ctx = await scContext(request, id, 'manager', { requireOpen: true });
    if (!ctx.ok) return ctx.response;
    const { auth, sc } = ctx;
    const supabase = auth.supabase;
    const body = await readJson(request);

    const supplier_name = cleanStr(body.supplier_name, 200);
    if (!supplier_name) return jsonError('supplier_name is required', 400);
    const amount = cleanNum(body.amount);
    if (amount == null || amount < 0) return jsonError('A valid quote amount is required', 400);

    let partner_assignment_id: string | null = null;
    if (isUuid(body.partner_assignment_id)) {
      const { data } = await supabase
        .from('support_call_partners')
        .select('id')
        .eq('id', body.partner_assignment_id)
        .eq('support_call_id', sc.id)
        .maybeSingle();
      if (!data) return jsonError('partner_assignment_id does not belong to this support call', 400);
      partner_assignment_id = data.id;
    }

    let document_id: string | null = null;
    if (isUuid(body.document_id)) {
      const { data } = await supabase
        .from('support_call_documents')
        .select('id')
        .eq('id', body.document_id)
        .eq('support_call_id', sc.id)
        .maybeSingle();
      if (!data) return jsonError('document_id does not belong to this support call', 400);
      document_id = data.id;
    }

    const { data: prior } = await supabase
      .from('support_call_quotes')
      .select('id, revision, status')
      .eq('support_call_id', sc.id)
      .ilike('supplier_name', supplier_name.replace(/[%_]/g, ''));
    const revision = Math.max(0, ...(prior || []).map((p: { revision: number }) => p.revision)) + 1;

    const { data: quote, error } = await supabase
      .from('support_call_quotes')
      .insert({
        support_call_id: sc.id,
        partner_assignment_id,
        revision,
        supplier_name,
        quote_reference: cleanStr(body.quote_reference, 200),
        quote_date: cleanDate(body.quote_date),
        description: cleanStr(body.description, 5000),
        amount,
        currency: cleanStr(body.currency, 3)?.toUpperCase() ?? 'ZAR',
        status: 'pending',
        document_id,
        created_by: auth.userId,
      })
      .select('*')
      .single();
    if (error) return dbError('quotes.create', error);

    const pendingPrior = (prior || []).filter((p: { status: string }) => p.status === 'pending');
    if (pendingPrior.length) {
      await supabase
        .from('support_call_quotes')
        .update({ status: 'superseded' })
        .in('id', pendingPrior.map((p: { id: string }) => p.id))
        .eq('status', 'pending');
    }

    await ctx.audit('quote_recorded', {
      related_id: quote.id,
      new_value: { supplier_name, revision, amount, currency: quote.currency, quote_reference: quote.quote_reference },
    });
    const stage = await recomputeWorkflowStage(supabase, sc.id);

    return NextResponse.json({ quote, workflow: stage }, { status: 201 });
  } catch (e) {
    return handleRouteError('POST /support-calls/[id]/quotes', e);
  }
}
