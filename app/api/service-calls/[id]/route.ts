import { NextRequest, NextResponse } from 'next/server';
import { getSafeErrorMessage, logSafeError } from '@/app/lib/safe-api-error';
import { canAccessServiceCallRow, requireServiceCallUser } from '@/app/lib/service-calls/auth';
import { writeServiceCallAudit } from '@/app/lib/service-calls/audit';
import {
  assertInvoicingTransition,
  assertTechnicalTransition,
} from '@/app/lib/service-calls/transitions';
import { normalizeExternalRef } from '@/app/lib/service-calls/normalize';
import type { InvoicingStatus, ServiceCall, TechnicalStatus } from '@/app/lib/service-calls/types';

type Ctx = { params: Promise<{ id: string }> };

async function loadScoped(auth: Awaited<ReturnType<typeof requireServiceCallUser>>, id: string) {
  if (!auth.ok) return { error: NextResponse.json({ error: auth.error }, { status: auth.status }) };
  const { data, error } = await auth.supabase.from('service_calls').select('*').eq('id', id).maybeSingle();
  if (error) return { error: NextResponse.json({ error: error.message }, { status: 500 }) };
  if (!data) return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  if (!canAccessServiceCallRow(data as ServiceCall, auth.userId, auth.isAdmin)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { auth, data: data as ServiceCall };
}

export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const auth = await requireServiceCallUser(request);
    const loaded = await loadScoped(auth, id);
    if ('error' in loaded && loaded.error) return loaded.error;

    const { data: visits } = await loaded.auth!.supabase
      .from('service_call_visits')
      .select('*')
      .eq('service_call_id', id)
      .order('visit_number', { ascending: true });
    const { data: jobCards } = await loaded.auth!.supabase
      .from('service_call_job_cards')
      .select('*')
      .eq('service_call_id', id)
      .order('created_at', { ascending: false });
    const { data: comments } = await loaded.auth!.supabase
      .from('service_call_comments')
      .select('*')
      .eq('service_call_id', id)
      .order('created_at', { ascending: false });
    const { data: documents } = await loaded.auth!.supabase
      .from('service_call_documents')
      .select('*')
      .eq('service_call_id', id)
      .order('created_at', { ascending: false });
    const { data: quotes } = await loaded.auth!.supabase
      .from('service_call_quotes')
      .select('*')
      .eq('service_call_id', id)
      .order('revision', { ascending: false });

    let assigneeName: string | null = null;
    if (loaded.data?.assigned_technician_id) {
      const { data: profile } = await loaded.auth!.supabase
        .from('profiles')
        .select('full_name')
        .eq('id', loaded.data.assigned_technician_id)
        .maybeSingle();
      assigneeName = profile?.full_name ?? null;
    }

    return NextResponse.json({
      serviceCall: loaded.data,
      visits: visits ?? [],
      jobCards: jobCards ?? [],
      comments: comments ?? [],
      documents: documents ?? [],
      quotes: quotes ?? [],
      assigneeName,
    });
  } catch (err) {
    logSafeError('GET /api/service-calls/[id]', err);
    return NextResponse.json({ error: getSafeErrorMessage(err) }, { status: 500 });
  }
}

const ALLOWED_PATCH = new Set([
  'title',
  'description',
  'client',
  'site_name',
  'estate_or_building',
  'cml_location',
  'location',
  'category',
  'fault_summary',
  'priority',
  'contract_ref',
  'coordinator_id',
  'coordinator_role_label',
  'assigned_technician_id',
  'technical_status',
  'invoicing_status',
  'remote_fix_possible',
  'remote_diagnosis',
  'remote_resolution',
  'escalation_reason',
  'parts_required',
  'quotation_required',
  'quotation_notes',
  'customer_signoff_obtained',
  'customer_signoff_notes',
  'customer_feedback',
  'confirmation_exception_reason',
  'knowledge_notes',
  'recurring_fault',
  'invoice_number',
  'invoice_issued_at',
  'invoice_amount',
  'amount_paid',
  'payment_status_note',
  'dispute_notes',
  'cancel_reason',
  'eta_at',
  'acknowledged_at',
  'supplier_invoice_number',
  'third_party_job_card_number',
  'po_number',
  'external_quote_reference',
]);

const ADMIN_ONLY_FINANCIAL = new Set([
  'invoicing_status',
  'invoice_number',
  'invoice_issued_at',
  'invoice_amount',
  'amount_paid',
  'payment_status_note',
  'dispute_notes',
]);

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const authResult = await requireServiceCallUser(request);
    const loaded = await loadScoped(authResult, id);
    if ('error' in loaded && loaded.error) return loaded.error;
    const auth = loaded.auth!;
    const current = loaded.data!;

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    for (const key of Object.keys(body)) {
      if (ALLOWED_PATCH.has(key)) updates[key] = body[key];
    }

    if ('assigned_technician_id' in updates && !auth.isAdmin) {
      return NextResponse.json({ error: 'Only admins can reassign technicians' }, { status: 403 });
    }

    for (const key of Object.keys(updates)) {
      if (ADMIN_ONLY_FINANCIAL.has(key) && !auth.isAdmin) {
        return NextResponse.json({ error: 'Only admins can edit invoicing fields' }, { status: 403 });
      }
    }

    // Keep normalized external refs in sync when raw values change
    if ('supplier_invoice_number' in updates) {
      updates.supplier_invoice_number_norm = normalizeExternalRef(
        updates.supplier_invoice_number as string | null
      );
    }
    if ('third_party_job_card_number' in updates) {
      updates.third_party_job_card_number_norm = normalizeExternalRef(
        updates.third_party_job_card_number as string | null
      );
    }
    if ('po_number' in updates) {
      updates.po_number_norm = normalizeExternalRef(updates.po_number as string | null);
    }
    if ('external_quote_reference' in updates) {
      updates.external_quote_reference_norm = normalizeExternalRef(
        updates.external_quote_reference as string | null
      );
    }

    if (updates.technical_status && updates.technical_status !== current.technical_status) {
      try {
        assertTechnicalTransition(
          current.technical_status,
          updates.technical_status as TechnicalStatus
        );
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid transition' }, { status: 400 });
      }
      const to = updates.technical_status as TechnicalStatus;
      if (to === 'acknowledgement_pending' || to === 'in_triage') {
        updates.acknowledged_at = updates.acknowledged_at || new Date().toISOString();
      }
      if (to === 'closed') updates.closed_at = new Date().toISOString();
      if (to === 'cancelled') updates.cancelled_at = new Date().toISOString();
      if (to === 'ready_to_invoice') {
        updates.ready_to_invoice_at = new Date().toISOString();
        if (!updates.invoicing_status) updates.invoicing_status = 'ready_to_invoice';
      }
    }

    if (updates.invoicing_status && updates.invoicing_status !== current.invoicing_status) {
      try {
        assertInvoicingTransition(
          current.invoicing_status,
          updates.invoicing_status as InvoicingStatus
        );
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid transition' }, { status: 400 });
      }
    }

    const { data, error } = await auth.supabase
      .from('service_calls')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await writeServiceCallAudit(auth.supabase, {
      service_call_id: id,
      action: 'updated',
      actor_id: auth.userId,
      from_technical_status: current.technical_status,
      to_technical_status: (data.technical_status as string) || current.technical_status,
      from_invoicing_status: current.invoicing_status,
      to_invoicing_status: (data.invoicing_status as string) || current.invoicing_status,
      payload_json: { keys: Object.keys(updates) },
      reason: typeof body.reason === 'string' ? body.reason : null,
    });

    return NextResponse.json({ serviceCall: data });
  } catch (err) {
    logSafeError('PATCH /api/service-calls/[id]', err);
    return NextResponse.json({ error: getSafeErrorMessage(err) }, { status: 500 });
  }
}
