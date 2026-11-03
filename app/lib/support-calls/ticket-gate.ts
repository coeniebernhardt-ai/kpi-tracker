import type { SupabaseClient } from '@supabase/supabase-js';

export type TicketCloseBlocker = {
  id: string;
  support_call_number: string;
  overall_status: string;
  reason: string;
};

/**
 * Returns linked support calls that block ticket closure (overall_status = 'open').
 * Empty array => ticket may close (or has no linked support call).
 */
export async function getTicketCloseBlockers(
  supabase: SupabaseClient,
  ticketId: string
): Promise<TicketCloseBlocker[]> {
  const { data: calls, error } = await supabase
    .from('support_calls')
    .select('id, support_call_number, overall_status')
    .eq('ticket_id', ticketId);

  if (error) {
    console.error('[support-calls] ticket close gate query failed', error.message);
    // Do not break unrelated tickets if the module's tables are not installed yet.
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      return [];
    }
    throw error;
  }

  if (!calls?.length) return [];

  return calls
    .filter((sc) => sc.overall_status === 'open')
    .map((sc) => ({
      id: sc.id,
      support_call_number: sc.support_call_number,
      overall_status: sc.overall_status,
      reason: `Support call ${sc.support_call_number} is still open (must be closed or cancelled).`,
    }));
}

export function formatCloseBlockMessage(blockers: TicketCloseBlocker[]): string {
  if (!blockers.length) return '';
  return (
    'Cannot close ticket until linked support calls are complete:\n' +
    blockers.map((b) => `• ${b.reason}`).join('\n')
  );
}
