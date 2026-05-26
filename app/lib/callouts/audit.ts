import type { SupabaseClient } from '@supabase/supabase-js';

export async function writeCalloutAudit(
  supabase: SupabaseClient,
  params: {
    entityType: string;
    entityId: string;
    action: string;
    payload?: Record<string, unknown>;
    userId?: string | null;
    ip?: string | null;
  },
) {
  const { error } = await supabase.from('callout_audit_log').insert({
    entity_type: params.entityType,
    entity_id: params.entityId,
    action: params.action,
    payload_json: params.payload ?? {},
    user_id: params.userId ?? null,
    ip: params.ip ?? null,
  });
  if (error) console.error('callout audit write failed', error.message);
}
