import type { SupabaseClient } from '@supabase/supabase-js';
import { TERMINAL_TECHNICAL } from './types';

export type TicketCloseBlocker = {
  id: string;
  service_call_number: string;
  technical_status: string;
  reason: string;
};

/**
 * Returns incomplete linked service calls that block ticket closure.
 * Empty array => ticket may close (or has no linked SCs).
 */
export async function getTicketCloseBlockers(
  supabase: SupabaseClient,
  ticketId: string
): Promise<TicketCloseBlocker[]> {
  const { data: calls, error } = await supabase
    .from('service_calls')
    .select('id, service_call_number, technical_status')
    .eq('ticket_id', ticketId);

  if (error) {
    console.error('[service-calls] ticket close gate query failed', error.message);
    // Fail closed if table missing would break unrelated tickets — only block when we have rows
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      return [];
    }
    throw error;
  }

  if (!calls?.length) return [];

  const blockers: TicketCloseBlocker[] = [];

  for (const sc of calls) {
    if (sc.technical_status === 'cancelled') continue;

    if (!TERMINAL_TECHNICAL.includes(sc.technical_status)) {
      blockers.push({
        id: sc.id,
        service_call_number: sc.service_call_number,
        technical_status: sc.technical_status,
        reason: `Service call ${sc.service_call_number} is still "${sc.technical_status}" (must be closed or cancelled).`,
      });
      continue;
    }

    if (sc.technical_status === 'closed') {
      const { data: cards } = await supabase
        .from('service_call_job_cards')
        .select('id, status')
        .eq('service_call_id', sc.id)
        .eq('status', 'accepted')
        .limit(1);

      if (!cards?.length) {
        blockers.push({
          id: sc.id,
          service_call_number: sc.service_call_number,
          technical_status: sc.technical_status,
          reason: `Service call ${sc.service_call_number} has no accepted job card.`,
        });
      }
    }
  }

  return blockers;
}

export function formatCloseBlockMessage(blockers: TicketCloseBlocker[]): string {
  if (!blockers.length) return '';
  return (
    'Cannot close ticket until linked service calls are complete:\n' +
    blockers.map((b) => `• ${b.reason}`).join('\n')
  );
}
