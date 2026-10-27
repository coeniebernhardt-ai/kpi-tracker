import type { SupabaseClient } from '@supabase/supabase-js';

type NotifyInput = {
  userIds: (string | null | undefined)[];
  type:
    | 'service_call_triage'
    | 'service_call_assigned'
    | 'service_call_accepted'
    | 'service_call_job_card_submitted'
    | 'service_call_job_card_returned'
    | 'service_call_ready_to_invoice'
    | 'service_call_escalation'
    | 'service_call_quote_decided'
    | 'service_call_duplicate_override'
    | 'service_call_override';
  title: string;
  message: string;
  ticket_id?: string | null;
  triggering_user_id: string;
  triggering_user_role: 'admin' | 'member';
};

export async function notifyServiceCallUsers(
  supabase: SupabaseClient,
  input: NotifyInput
): Promise<void> {
  const unique = [...new Set(input.userIds.filter((id): id is string => Boolean(id)))];
  if (!unique.length) return;

  const rows = unique.map((user_id) => ({
    user_id,
    type: input.type,
    ticket_id: input.ticket_id ?? null,
    triggering_user_role: input.triggering_user_role,
    triggering_user_id: input.triggering_user_id,
    title: input.title,
    message: input.message,
    read: false,
  }));

  const { error } = await supabase.from('notifications').insert(rows);
  if (error) {
    console.error('[service-calls] notify failed', error.message);
  }
}

export async function listAdminIds(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase.from('profiles').select('id').eq('is_admin', true).eq('is_active', true);
  return (data || []).map((p) => p.id);
}
