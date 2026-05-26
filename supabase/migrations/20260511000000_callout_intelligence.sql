-- Contractor Callout Intelligence — schema, RLS, storage bucket, seed contractors
-- Run in Supabase SQL Editor or via migration tooling.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- Contractors & templates
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Upload batches
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Callout records (master entity)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Documents
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Immutable extractions
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Canonical field values & corrections
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Document links & suggestions
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Flags
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- AI enrichments
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Comments & audit
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Processing jobs
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Search chunks (pgvector)
-- ---------------------------------------------------------------------------
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

-- HNSW index for vector search (create after some data if needed; safe on empty table)
CREATE INDEX IF NOT EXISTS idx_callout_search_chunks_embedding
  ON callout_search_chunks USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_callout_records_embedding
  ON callout_records USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Helper: admin check
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_callout_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
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

-- Admin read/write policies (service role bypasses RLS)
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

-- Immutability: no UPDATE/DELETE on extractions or corrections via RLS for admins
DROP POLICY IF EXISTS callout_extractions_insert_only ON callout_extractions;
CREATE POLICY callout_extractions_insert_select ON callout_extractions
  FOR SELECT USING (is_callout_admin());
CREATE POLICY callout_extractions_insert ON callout_extractions
  FOR INSERT WITH CHECK (is_callout_admin());

DROP POLICY IF EXISTS callout_corrections_insert_only ON callout_field_corrections;
CREATE POLICY callout_corrections_select ON callout_field_corrections
  FOR SELECT USING (is_callout_admin());
CREATE POLICY callout_corrections_insert ON callout_field_corrections
  FOR INSERT WITH CHECK (is_callout_admin());

DROP POLICY IF EXISTS callout_audit_insert_only ON callout_audit_log;
CREATE POLICY callout_audit_select ON callout_audit_log
  FOR SELECT USING (is_callout_admin());
CREATE POLICY callout_audit_insert ON callout_audit_log
  FOR INSERT WITH CHECK (is_callout_admin());

-- ---------------------------------------------------------------------------
-- Storage bucket (private)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('callout-documents', 'callout-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- ---------------------------------------------------------------------------
-- Seed: 5 contractors with templates
-- ---------------------------------------------------------------------------
INSERT INTO contractors (name, code) VALUES
  ('Alpha Electrical', 'alpha_electrical'),
  ('Beta HVAC Services', 'beta_hvac'),
  ('Gamma Plumbing', 'gamma_plumbing'),
  ('Delta Security Systems', 'delta_security'),
  ('Epsilon Facilities', 'epsilon_facilities')
ON CONFLICT (code) DO NOTHING;

-- Templates seeded in separate seed file for maintainability
