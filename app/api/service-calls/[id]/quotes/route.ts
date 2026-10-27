import { NextRequest, NextResponse } from 'next/server';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';
import { canAccessServiceCallRow, requireServiceCallUser } from '@/app/lib/service-calls/auth';
import { writeServiceCallAudit } from '@/app/lib/service-calls/audit';
import type { ServiceCall } from '@/app/lib/service-calls/types';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const auth = await requireServiceCallUser(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { data: current } = await auth.supabase.from('service_calls').select('*').eq('id', id).maybeSingle();
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!canAccessServiceCallRow(current as ServiceCall, auth.userId, auth.isAdmin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await auth.supabase
      .from('service_call_quotes')
      .select('*')
      .eq('service_call_id', id)
      .order('revision', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ quotes: data ?? [] });
  } catch (err) {
    logSafeError('GET quotes', err);
    return NextResponse.json({ error: getSafeErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const auth = await requireServiceCallUser(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { data: current } = await auth.supabase.from('service_calls').select('*').eq('id', id).maybeSingle();
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!canAccessServiceCallRow(current as ServiceCall, auth.userId, auth.isAdmin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const supplier_name = String(body.supplier_name || '').trim();
    if (!supplier_name) {
      return NextResponse.json({ error: 'supplier_name is required' }, { status: 400 });
    }

    const { data: latest } = await auth.supabase
      .from('service_call_quotes')
      .select('revision')
      .eq('service_call_id', id)
      .order('revision', { ascending: false })
      .limit(1);
    const revision = (latest?.[0]?.revision || 0) + 1;

    // Supersede any pending quotes when a new revision is added
    await auth.supabase
      .from('service_call_quotes')
      .update({ status: 'superseded', updated_at: new Date().toISOString() })
      .eq('service_call_id', id)
      .eq('status', 'pending');

    const { data: quote, error } = await auth.supabase
      .from('service_call_quotes')
      .insert({
        service_call_id: id,
        revision,
        supplier_name,
        quote_reference: body.quote_reference?.trim() || null,
        quote_date: body.quote_date || null,
        amount: body.amount != null ? Number(body.amount) : null,
        currency: body.currency || 'ZAR',
        description: body.description?.trim() || null,
        document_id: body.document_id || null,
        status: 'pending',
        created_by: auth.userId,
      })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const scUpdate: Record<string, unknown> = {
      quotation_required: true,
      quotation_notes: body.description?.trim() || current.quotation_notes,
      technical_status:
        current.technical_status === 'on_site' ||
        current.technical_status === 'repair_and_testing' ||
        current.technical_status === 'awaiting_parts_quote_escalation'
          ? 'awaiting_parts_quote_escalation'
          : current.technical_status,
    };
    if (body.quote_reference) {
      scUpdate.external_quote_reference = String(body.quote_reference).trim();
    }

    await auth.supabase.from('service_calls').update(scUpdate).eq('id', id);

    await writeServiceCallAudit(auth.supabase, {
      service_call_id: id,
      action: 'quote_added',
      actor_id: auth.userId,
      from_technical_status: current.technical_status,
      to_technical_status: scUpdate.technical_status as string,
      payload_json: { quote_id: quote.id, revision, supplier_name },
    });

    return NextResponse.json({ quote }, { status: 201 });
  } catch (err) {
    logSafeError('POST quotes', err);
    return NextResponse.json({ error: getSafeErrorMessage(err) }, { status: 500 });
  }
}
