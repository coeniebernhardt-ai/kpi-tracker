import type { SupabaseClient } from '@supabase/supabase-js';
import type { CalloutJobType } from './types';

export async function enqueueCalloutJob(
  supabase: SupabaseClient,
  documentId: string,
  jobType: CalloutJobType,
  priority = 5,
) {
  const { error } = await supabase.from('callout_processing_jobs').insert({
    document_id: documentId,
    job_type: jobType,
    status: 'pending',
    priority,
  });
  if (error) throw error;
}

export async function enqueueCalloutPipeline(
  supabase: SupabaseClient,
  documentId: string,
  priority = 5,
) {
  await enqueueCalloutJob(supabase, documentId, 'preprocess', priority);
}
