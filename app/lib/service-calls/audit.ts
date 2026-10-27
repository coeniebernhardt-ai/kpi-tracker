import type { SupabaseClient } from '@supabase/supabase-js';

export async function writeServiceCallAudit(
  supabase: SupabaseClient,
  input: {
    service_call_id: string;
    action: string;
    actor_id: string | null;
    from_technical_status?: string | null;
    to_technical_status?: string | null;
    from_invoicing_status?: string | null;
    to_invoicing_status?: string | null;
    reason?: string | null;
    payload_json?: Record<string, unknown>;
  }
): Promise<void> {
  const { error } = await supabase.from('service_call_audit_log').insert({
    service_call_id: input.service_call_id,
    action: input.action,
    actor_id: input.actor_id,
    from_technical_status: input.from_technical_status ?? null,
    to_technical_status: input.to_technical_status ?? null,
    from_invoicing_status: input.from_invoicing_status ?? null,
    to_invoicing_status: input.to_invoicing_status ?? null,
    reason: input.reason ?? null,
    payload_json: input.payload_json ?? {},
  });
  if (error) {
    console.error('[service-calls] audit insert failed', error.message);
  }
}
