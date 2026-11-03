import type { SupabaseClient } from '@supabase/supabase-js';

export type SupportCallAuditInput = {
  support_call_id: string;
  ticket_id?: string | null;
  related_id?: string | null;
  actor_id: string | null;
  actor_role: string | null;
  event_type: string;
  previous_value?: unknown;
  new_value?: unknown;
  reason?: string | null;
  source?: string | null;
};

/** Best-effort audit write; failures are logged and never thrown. */
export async function writeSupportCallAudit(
  supabase: SupabaseClient,
  input: SupportCallAuditInput
): Promise<void> {
  const { error } = await supabase.from('support_call_audit_events').insert({
    support_call_id: input.support_call_id,
    ticket_id: input.ticket_id ?? null,
    related_id: input.related_id ?? null,
    actor_id: input.actor_id,
    actor_role: input.actor_role,
    event_type: input.event_type,
    previous_value: input.previous_value ?? null,
    new_value: input.new_value ?? null,
    reason: input.reason ?? null,
    source: input.source ?? null,
  });
  if (error) {
    console.error('[support-calls] audit insert failed', error.message);
  }
}
