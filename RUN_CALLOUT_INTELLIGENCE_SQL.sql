-- =============================================================================
-- Contractor Callout Intelligence — run in Supabase SQL Editor (in one go)
-- Dashboard → SQL Editor → New query → paste this file → Run
--
-- Prerequisite: enable "vector" extension if CREATE EXTENSION fails:
--   Database → Extensions → search "vector" → Enable
-- =============================================================================

-- ========== MIGRATION 1 of 3: Schema, RLS, storage, contractors ==========

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS contractors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  active_template_job_card_id UUID,
  active_template_invoice_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contractor_extraction_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('job_card', 'invoice')),
  version TEXT NOT NULL DEFAULT '1.0.0',
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (contractor_id, doc_type, version)
);

CREATE TABLE IF NOT EXISTS callout_upload_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contractor_id UUID NOT NULL REFERENCES contractors(id),
  document_count INT NOT NULL DEFAULT 0,
  processed_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS callout_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contractor_id UUID NOT NULL REFERENCES contractors(id),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'processing', 'needs_review', 'approved', 'archived')),
  primary_job_card_number TEXT,
  primary_site_name TEXT,
  service_date DATE,
  total_billed NUMERIC(14, 2),
  compliance_score INT CHECK (compliance_score >= 0 AND compliance_score <= 100),
  compliance_breakdown_json JSONB DEFAULT '{}'::jsonb,
  ai_summary TEXT,
  fault_classification TEXT[] DEFAULT '{}',
  embedding vector(1536),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_callout_records_contractor_jc
  ON callout_records (contractor_id, primary_job_card_number);
CREATE INDEX IF NOT EXISTS idx_callout_records_contractor_date
  ON callout_records (contractor_id, service_date DESC);
CREATE INDEX IF NOT EXISTS idx_callout_records_status ON callout_records (status);

CREATE TABLE IF NOT EXISTS callout_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  callout_record_id UUID REFERENCES callout_records(id) ON DELETE SET NULL,
  contractor_id UUID NOT NULL REFERENCES contractors(id),
  doc_type TEXT NOT NULL CHECK (doc_type IN ('job_card', 'invoice')),
  upload_batch_id UUID REFERENCES callout_upload_batches(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_hash_sha256 TEXT NOT NULL,
  page_count INT,
  scan_quality_score NUMERIC(5, 2),
  processing_status TEXT NOT NULL DEFAULT 'queued'
    CHECK (processing_status IN ('queued', 'ocr', 'extracted', 'enriched', 'failed')),
  uploaded_by UUID REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'bulk_import')),
  UNIQUE (contractor_id, file_hash_sha256)
);

CREATE INDEX IF NOT EXISTS idx_callout_documents_record ON callout_documents (callout_record_id);
CREATE INDEX IF NOT EXISTS idx_callout_documents_status ON callout_documents (processing_status);
CREATE INDEX IF NOT EXISTS idx_callout_documents_batch ON callout_documents (upload_batch_id);

CREATE TABLE IF NOT EXISTS callout_extractions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES callout_documents(id) ON DELETE CASCADE,
  template_version TEXT,
  extractor_version TEXT NOT NULL DEFAULT '1.0.0',
  raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ocr_text TEXT,
  ocr_confidence_avg NUMERIC(5, 2),
  extracted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_callout_extractions_document ON callout_extractions (document_id, extracted_at DESC);

CREATE TABLE IF NOT EXISTS callout_field_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  callout_record_id UUID REFERENCES callout_records(id) ON DELETE CASCADE,
  document_id UUID REFERENCES callout_documents(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  value_text TEXT,
  value_numeric NUMERIC(14, 4),
  value_json JSONB,
  source TEXT NOT NULL DEFAULT 'extraction'
    CHECK (source IN ('extraction', 'manual', 'ai_suggestion_accepted')),
  last_extraction_id UUID REFERENCES callout_extractions(id),
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT callout_field_values_target CHECK (
    callout_record_id IS NOT NULL OR document_id IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_callout_field_values_doc_key
  ON callout_field_values (document_id, field_key) WHERE document_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_callout_field_values_record_key
  ON callout_field_values (callout_record_id, field_key) WHERE callout_record_id IS NOT NULL AND document_id IS NULL;

CREATE TABLE IF NOT EXISTS callout_field_corrections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  field_value_id UUID NOT NULL REFERENCES callout_field_values(id) ON DELETE CASCADE,
  old_value JSONB,
  new_value JSONB NOT NULL,
  reason TEXT,
  user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS callout_document_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  callout_record_id UUID NOT NULL REFERENCES callout_records(id) ON DELETE CASCADE,
  job_card_document_id UUID NOT NULL REFERENCES callout_documents(id) ON DELETE CASCADE,
  invoice_document_id UUID NOT NULL REFERENCES callout_documents(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL CHECK (link_type IN ('auto_exact_ref', 'manual')),
  link_evidence JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (invoice_document_id)
);

CREATE TABLE IF NOT EXISTS callout_link_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES callout_documents(id) ON DELETE CASCADE,
  suggested_callout_record_id UUID NOT NULL REFERENCES callout_records(id) ON DELETE CASCADE,
  confidence NUMERIC(5, 4) NOT NULL,
  reason_json JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS callout_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  callout_record_id UUID NOT NULL REFERENCES callout_records(id) ON DELETE CASCADE,
  document_id UUID REFERENCES callout_documents(id) ON DELETE SET NULL,
  flag_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  detail_json JSONB DEFAULT '{}'::jsonb,
  rule_id TEXT,
  ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'approved', 'rejected', 'false_positive')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_callout_flags_record ON callout_flags (callout_record_id);
CREATE INDEX IF NOT EXISTS idx_callout_flags_status ON callout_flags (status) WHERE status = 'open';

CREATE TABLE IF NOT EXISTS callout_ai_enrichments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_type TEXT NOT NULL CHECK (target_type IN ('record', 'document')),
  target_id UUID NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL DEFAULT '1.0.0',
  output_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_callout_ai_enrichments_target
  ON callout_ai_enrichments (target_type, target_id, created_at DESC);

CREATE TABLE IF NOT EXISTS callout_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  callout_record_id UUID NOT NULL REFERENCES callout_records(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id),
  is_internal BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS callout_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  payload_json JSONB DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES profiles(id),
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_callout_audit_entity ON callout_audit_log (entity_type, entity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS callout_processing_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES callout_documents(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL
    CHECK (job_type IN ('preprocess', 'ocr_extract', 'match_and_flag', 'ai_enrich', 'reindex_search')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'dead_letter')),
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  priority INT NOT NULL DEFAULT 5,
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  error TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_callout_jobs_pending
  ON callout_processing_jobs (status, priority DESC, scheduled_at)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS callout_search_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  callout_record_id UUID NOT NULL REFERENCES callout_records(id) ON DELETE CASCADE,
  document_id UUID REFERENCES callout_documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL DEFAULT 0,
  chunk_text TEXT NOT NULL,
  embedding vector(1536),
  metadata_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_callout_search_chunks_record ON callout_search_chunks (callout_record_id);

CREATE INDEX IF NOT EXISTS idx_callout_search_chunks_embedding
  ON callout_search_chunks USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_callout_records_embedding
  ON callout_records USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;

CREATE OR REPLACE FUNCTION is_callout_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_extraction_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE callout_upload_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE callout_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE callout_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE callout_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE callout_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE callout_field_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE callout_document_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE callout_link_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE callout_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE callout_ai_enrichments ENABLE ROW LEVEL SECURITY;
ALTER TABLE callout_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE callout_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE callout_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE callout_search_chunks ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'contractors', 'contractor_extraction_templates', 'callout_upload_batches',
    'callout_records', 'callout_documents', 'callout_extractions',
    'callout_field_values', 'callout_field_corrections', 'callout_document_links',
    'callout_link_suggestions', 'callout_flags', 'callout_ai_enrichments',
    'callout_comments', 'callout_audit_log', 'callout_processing_jobs', 'callout_search_chunks'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS callout_admin_all ON %I', t);
    EXECUTE format(
      'CREATE POLICY callout_admin_all ON %I FOR ALL USING (is_callout_admin()) WITH CHECK (is_callout_admin())',
      t
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS callout_extractions_insert_only ON callout_extractions;
DROP POLICY IF EXISTS callout_admin_all ON callout_extractions;
CREATE POLICY callout_extractions_insert_select ON callout_extractions
  FOR SELECT USING (is_callout_admin());
CREATE POLICY callout_extractions_insert ON callout_extractions
  FOR INSERT WITH CHECK (is_callout_admin());

DROP POLICY IF EXISTS callout_corrections_insert_only ON callout_field_corrections;
DROP POLICY IF EXISTS callout_admin_all ON callout_field_corrections;
CREATE POLICY callout_corrections_select ON callout_field_corrections
  FOR SELECT USING (is_callout_admin());
CREATE POLICY callout_corrections_insert ON callout_field_corrections
  FOR INSERT WITH CHECK (is_callout_admin());

DROP POLICY IF EXISTS callout_audit_insert_only ON callout_audit_log;
DROP POLICY IF EXISTS callout_admin_all ON callout_audit_log;
CREATE POLICY callout_audit_select ON callout_audit_log
  FOR SELECT USING (is_callout_admin());
CREATE POLICY callout_audit_insert ON callout_audit_log
  FOR INSERT WITH CHECK (is_callout_admin());

INSERT INTO storage.buckets (id, name, public)
VALUES ('callout-documents', 'callout-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

INSERT INTO contractors (name, code) VALUES
  ('Alpha Electrical', 'alpha_electrical'),
  ('Beta HVAC Services', 'beta_hvac'),
  ('Gamma Plumbing', 'gamma_plumbing'),
  ('Delta Security Systems', 'delta_security'),
  ('Epsilon Facilities', 'epsilon_facilities')
ON CONFLICT (code) DO NOTHING;

-- ========== MIGRATION 2 of 3: Extraction templates ==========

INSERT INTO contractor_extraction_templates (contractor_id, doc_type, version, config_json, is_active)
SELECT c.id, t.doc_type, '1.0.0', t.config_json, TRUE
FROM contractors c
CROSS JOIN (
  VALUES
    ('job_card', '{"template_key":"generic_v1","zones":{"header":{"x0":0.05,"y0":0.02,"x1":0.95,"y1":0.25},"body":{"x0":0.05,"y0":0.25,"x1":0.95,"y1":0.75},"totals":{"x0":0.55,"y0":0.75,"x1":0.95,"y1":0.9},"signature":{"x0":0.05,"y0":0.85,"x1":0.45,"y1":0.98}},"regex":{"job_card_number":"(?i)(?:job\\s*(?:card|no\\.?|#)\\s*[:#]?\\s*)([A-Z0-9\\-/]+)","service_date":"(?i)(?:date|service date)\\s*[:#]?\\s*(\\d{1,2}[\\/\\-]\\d{1,2}[\\/\\-]\\d{2,4})","site_name":"(?i)(?:site|client|location)\\s*[:#]?\\s*([^\\n]+)","technician_name":"(?i)(?:technician|engineer|tech)\\s*[:#]?\\s*([^\\n]+)","hours_worked":"(?i)(?:hours?|time on site)\\s*[:#]?\\s*(\\d+(?:\\.\\d+)?)","po_number":"(?i)(?:p\\.?o\\.?\\s*(?:no\\.?|number)?)\\s*[:#]?\\s*([A-Z0-9\\-/]+)"},"fields":["service_date","job_card_number","site_name","site_location","technician_name","hours_worked","work_description","materials_used","labour_charges","travel_charges","po_number","signature_present"]}'::jsonb),
    ('invoice', '{"template_key":"generic_v1","zones":{"header":{"x0":0.05,"y0":0.02,"x1":0.95,"y1":0.22},"line_items":{"x0":0.05,"y0":0.22,"x1":0.95,"y1":0.72},"totals":{"x0":0.55,"y0":0.72,"x1":0.95,"y1":0.92}},"regex":{"invoice_number":"(?i)(?:invoice\\s*(?:no\\.?|#)\\s*[:#]?\\s*)([A-Z0-9\\-/]+)","referenced_job_card_number":"(?i)(?:job\\s*(?:card|ref\\.?|reference)\\s*[:#]?\\s*)([A-Z0-9\\-/]+)","service_date":"(?i)(?:date|invoice date)\\s*[:#]?\\s*(\\d{1,2}[\\/\\-]\\d{1,2}[\\/\\-]\\d{2,4})","subtotal":"(?i)sub\\s*total\\s*[:#]?\\s*R?\\s*([\\d,]+(?:\\.\\d{2})?)","vat":"(?i)(?:vat|tax)\\s*[:#]?\\s*R?\\s*([\\d,]+(?:\\.\\d{2})?)","total":"(?i)(?:total|amount due)\\s*[:#]?\\s*R?\\s*([\\d,]+(?:\\.\\d{2})?)","po_number":"(?i)(?:p\\.?o\\.?\\s*(?:no\\.?|number)?)\\s*[:#]?\\s*([A-Z0-9\\-/]+)","vat_number":"(?i)(?:vat\\s*(?:reg\\.?|no\\.?))\\s*[:#]?\\s*(\\d+)"},"fields":["service_date","invoice_number","referenced_job_card_number","site_name","site_location","hours_worked","work_description","materials_used","labour_charges","travel_charges","subtotal","vat","total","po_number"]}'::jsonb)
) AS t(doc_type, config_json)
WHERE c.code IN (
  'alpha_electrical', 'beta_hvac', 'gamma_plumbing', 'delta_security', 'epsilon_facilities'
)
ON CONFLICT (contractor_id, doc_type, version) DO UPDATE SET config_json = EXCLUDED.config_json;

UPDATE contractor_extraction_templates cet
SET config_json = config_json || '{"contractor_override":"alpha_electrical","job_card_prefix":"ALP-"}'::jsonb
FROM contractors c
WHERE cet.contractor_id = c.id AND c.code = 'alpha_electrical' AND cet.doc_type = 'job_card';

UPDATE contractor_extraction_templates cet
SET config_json = config_json || '{"contractor_override":"beta_hvac","job_card_prefix":"BHV-"}'::jsonb
FROM contractors c
WHERE cet.contractor_id = c.id AND c.code = 'beta_hvac' AND cet.doc_type = 'job_card';

UPDATE contractor_extraction_templates cet
SET config_json = config_json || '{"contractor_override":"gamma_plumbing","job_card_prefix":"GPL-"}'::jsonb
FROM contractors c
WHERE cet.contractor_id = c.id AND c.code = 'gamma_plumbing' AND cet.doc_type = 'job_card';

UPDATE contractor_extraction_templates cet
SET config_json = config_json || '{"contractor_override":"delta_security","job_card_prefix":"DSS-"}'::jsonb
FROM contractors c
WHERE cet.contractor_id = c.id AND c.code = 'delta_security' AND cet.doc_type = 'job_card';

UPDATE contractor_extraction_templates cet
SET config_json = config_json || '{"contractor_override":"epsilon_facilities","job_card_prefix":"EPS-"}'::jsonb
FROM contractors c
WHERE cet.contractor_id = c.id AND c.code = 'epsilon_facilities' AND cet.doc_type = 'job_card';

-- ========== MIGRATION 3 of 3: Semantic search function ==========

CREATE OR REPLACE FUNCTION search_callout_records_semantic(
  query_embedding vector(1536),
  match_count INT DEFAULT 20,
  contractor_filter UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  contractor_id UUID,
  status TEXT,
  primary_job_card_number TEXT,
  primary_site_name TEXT,
  service_date DATE,
  compliance_score INT,
  ai_summary TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.contractor_id,
    r.status,
    r.primary_job_card_number,
    r.primary_site_name,
    r.service_date,
    r.compliance_score,
    r.ai_summary,
    (1 - (r.embedding <=> query_embedding))::FLOAT AS similarity
  FROM callout_records r
  WHERE r.embedding IS NOT NULL
    AND (contractor_filter IS NULL OR r.contractor_id = contractor_filter)
  ORDER BY r.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- ========== Verify ==========
SELECT 'contractors' AS tbl, COUNT(*)::int AS rows FROM contractors
UNION ALL
SELECT 'templates', COUNT(*)::int FROM contractor_extraction_templates
UNION ALL
SELECT 'search_fn', CASE WHEN EXISTS (
  SELECT 1 FROM pg_proc WHERE proname = 'search_callout_records_semantic'
) THEN 1 ELSE 0 END;
