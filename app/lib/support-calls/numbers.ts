import type { SupabaseClient } from '@supabase/supabase-js';

/** Next daily sequential number: SC-YYYYMMDD-NNN. */
export async function nextSupportCallNumber(supabase: SupabaseClient): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `SC-${dateStr}-`;

  const { data } = await supabase
    .from('support_calls')
    .select('support_call_number')
    .like('support_call_number', `${prefix}%`)
    .order('support_call_number', { ascending: false })
    .limit(1);

  let seq = 1;
  const last = data?.[0]?.support_call_number as string | undefined;
  if (last) {
    const part = last.split('-').pop();
    const n = parseInt(part || '0', 10);
    if (!Number.isNaN(n)) seq = n + 1;
  }

  return `${prefix}${String(seq).padStart(3, '0')}`;
}
