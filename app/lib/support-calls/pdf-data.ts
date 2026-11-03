import type { SupabaseClient } from '@supabase/supabase-js';
import { loadProfilesById } from './server';

export type PdfSourceData = {
  visits: Record<string, unknown>[];
  hardware: Record<string, unknown>[];
  quotes: Record<string, unknown>[];
  memberNames: Record<string, string>; // assignment_id -> name
};

export async function loadPdfSourceData(supabase: SupabaseClient, scId: string): Promise<PdfSourceData> {
  const [visits, hardware, quotes, assignments] = await Promise.all([
    supabase.from('support_call_visits').select('*').eq('support_call_id', scId).order('visit_number'),
    supabase.from('support_call_hardware_items').select('*').eq('support_call_id', scId).order('created_at'),
    supabase.from('support_call_quotes').select('*').eq('support_call_id', scId).order('created_at'),
    supabase.from('support_call_assignments').select('id, member_id').eq('support_call_id', scId),
  ]);
  const assignmentRows = (assignments.data || []) as { id: string; member_id: string }[];
  const profiles = await loadProfilesById(
    supabase,
    assignmentRows.map((a) => a.member_id)
  );
  const memberNames: Record<string, string> = {};
  for (const a of assignmentRows) memberNames[a.id] = profiles[a.member_id]?.full_name || 'Team member';
  return {
    visits: (visits.data || []) as Record<string, unknown>[],
    hardware: (hardware.data || []) as Record<string, unknown>[],
    quotes: (quotes.data || []) as Record<string, unknown>[],
    memberNames,
  };
}
