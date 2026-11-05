import type { SupabaseClient } from '@supabase/supabase-js';

export type TicketCloseBlocker = {
  id: string;
  support_call_number: string;
  overall_status: string;
  reason: string;
};

/**
 * Linked open support calls block ticket closure only while applicable technical work
 * is still incomplete. Once every internal assignee (and assigned partner) has
 * work_completed_at, HTO may close the shared ticket while the Support Call stays open
 * for job card / finance.
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
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      return [];
    }
    throw error;
  }

  if (!calls?.length) return [];

  const open = calls.filter((sc) => sc.overall_status === 'open');
  if (!open.length) return [];

  const blockers: TicketCloseBlocker[] = [];

  for (const sc of open) {
    const [{ data: assignments }, { data: partners }] = await Promise.all([
      supabase
        .from('support_call_assignments')
        .select('id, member_id, work_completed_at')
        .eq('support_call_id', sc.id),
      supabase
        .from('support_call_partners')
        .select('id, company_name, work_completed_at')
        .eq('support_call_id', sc.id),
    ]);

    const pendingAssignees = (assignments || []).filter((a) => !a.work_completed_at);
    const pendingPartners = (partners || []).filter((p) => !p.work_completed_at);

    if (!assignments?.length && !partners?.length) {
      blockers.push({
        id: sc.id,
        support_call_number: sc.support_call_number,
        overall_status: sc.overall_status,
        reason: `Support call ${sc.support_call_number} has no technician or partner assignment yet. Assign work and wait for Complete My Work before closing the ticket.`,
      });
      continue;
    }

    if (pendingAssignees.length || pendingPartners.length) {
      const parts: string[] = [];
      if (pendingAssignees.length) {
        parts.push(
          `${pendingAssignees.length} assigned technician${pendingAssignees.length === 1 ? '' : 's'} still need${pendingAssignees.length === 1 ? 's' : ''} to select Complete My Work`
        );
      }
      if (pendingPartners.length) {
        parts.push(
          `${pendingPartners.length} external partner${pendingPartners.length === 1 ? '' : 's'} still need${pendingPartners.length === 1 ? 's' : ''} HTO to record partner work complete`
        );
      }
      blockers.push({
        id: sc.id,
        support_call_number: sc.support_call_number,
        overall_status: sc.overall_status,
        reason: `Ticket cannot be closed yet on ${sc.support_call_number}. ${parts.join('; ')}.`,
      });
    }
  }

  return blockers;
}

export function formatCloseBlockMessage(blockers: TicketCloseBlocker[]): string {
  if (!blockers.length) return '';
  return (
    'Ticket cannot be closed yet:\n' + blockers.map((b) => `• ${b.reason}`).join('\n')
  );
}
