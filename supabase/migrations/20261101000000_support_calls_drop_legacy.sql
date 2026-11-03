-- Drop experimental Service Calls + Callouts objects only.
-- Safe for tickets / profiles / notifications (shared). Run in Supabase SQL Editor.

-- Service call quotes / dedupe extras
DROP TABLE IF EXISTS service_call_duplicate_decisions CASCADE;
DROP TABLE IF EXISTS service_call_quotes CASCADE;
DROP TABLE IF EXISTS service_call_comments CASCADE;
DROP TABLE IF EXISTS service_call_audit_log CASCADE;
DROP TABLE IF EXISTS service_call_documents CASCADE;
DROP TABLE IF EXISTS service_call_job_cards CASCADE;
DROP TABLE IF EXISTS service_call_visits CASCADE;
DROP TABLE IF EXISTS service_calls CASCADE;

DROP FUNCTION IF EXISTS set_service_calls_updated_at() CASCADE;
DROP FUNCTION IF EXISTS is_service_call_admin() CASCADE;
DROP FUNCTION IF EXISTS can_access_service_call(service_calls) CASCADE;

-- Callout intelligence leftovers
DROP TABLE IF EXISTS callout_search_chunks CASCADE;
DROP TABLE IF EXISTS callout_processing_jobs CASCADE;
DROP TABLE IF EXISTS callout_audit_log CASCADE;
DROP TABLE IF EXISTS callout_comments CASCADE;
DROP TABLE IF EXISTS callout_ai_enrichments CASCADE;
DROP TABLE IF EXISTS callout_flags CASCADE;
DROP TABLE IF EXISTS callout_link_suggestions CASCADE;
DROP TABLE IF EXISTS callout_document_links CASCADE;
DROP TABLE IF EXISTS callout_field_corrections CASCADE;
DROP TABLE IF EXISTS callout_field_values CASCADE;
DROP TABLE IF EXISTS callout_extracted CASCADE;
DROP TABLE IF EXISTS callout_documents CASCADE;
DROP TABLE IF EXISTS callout_records CASCADE;
DROP TABLE IF EXISTS callout_upload_batches CASCADE;
DROP TABLE IF EXISTS contractor_extraction_templates CASCADE;
DROP TABLE IF EXISTS contractors CASCADE;

DROP FUNCTION IF EXISTS is_callout_admin() CASCADE;
DROP FUNCTION IF EXISTS search_callout_records_semantic(vector, integer, double precision) CASCADE;

-- Remove experimental notification rows that would violate the new CHECK
DELETE FROM notifications
WHERE type LIKE 'service_call_%'
   OR type LIKE 'callout_%'
   OR type IN (
     'service_call_triage',
     'service_call_assigned',
     'service_call_accepted',
     'service_call_job_card_submitted',
     'service_call_job_card_returned',
     'service_call_ready_to_invoice',
     'service_call_escalation',
     'service_call_quote_decided',
     'service_call_duplicate_override',
     'service_call_override'
   );

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'admin_comment',
    'added_to_ticket',
    'admin_broadcast',
    'support_call_assigned',
    'support_call_attention',
    'support_call_contribution_submitted',
    'support_call_contribution_returned',
    'support_call_quote_decision',
    'support_call_dependency'
  ));

-- Storage buckets (ignore errors if missing)
DO $$ BEGIN
  DELETE FROM storage.objects WHERE bucket_id IN ('service-call-documents', 'callout-documents');
  DELETE FROM storage.buckets WHERE id IN ('service-call-documents', 'callout-documents');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
