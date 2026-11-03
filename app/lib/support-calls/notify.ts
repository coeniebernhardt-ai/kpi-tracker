import type { SupabaseClient } from '@supabase/supabase-js';

export type SupportCallNotificationType =
  | 'support_call_assigned'
  | 'support_call_attention'
  | 'support_call_contribution_submitted'
  | 'support_call_contribution_returned'
  | 'support_call_quote_decision'
  | 'support_call_dependency';

export type NotifySupportCallInput = {
  userIds: (string | null | undefined)[];
  type: SupportCallNotificationType;
  title: string;
  message: string;
  ticket_id?: string | null;
  triggering_user_id: string;
  triggering_user_role: 'admin' | 'member';
};

/** Best-effort in-app notifications; de-duplicates recipients and never throws. */
export async function notifySupportCallUsers(
  supabase: SupabaseClient,
  input: NotifySupportCallInput
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
    console.error('[support-calls] notify failed', error.message);
  }
}

/** Active admins and HTOs. */
export async function listManagerIds(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .or('is_admin.eq.true,is_hto.eq.true')
    .eq('is_active', true);
  return (data || []).map((p: { id: string }) => p.id);
}
