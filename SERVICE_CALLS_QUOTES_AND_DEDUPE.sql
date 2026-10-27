-- Additive Service Calls: quotes, external refs, duplicate decisions
-- Run in Supabase SQL Editor AFTER SERVICE_CALLS_SCHEMA.sql
-- Does NOT drop existing service_calls data.

-- ============================================
-- External reference columns on service_calls
-- ============================================
ALTER TABLE service_calls
  ADD COLUMN IF NOT EXISTS supplier_invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS third_party_job_card_number TEXT,
  ADD COLUMN IF NOT EXISTS po_number TEXT,
  ADD COLUMN IF NOT EXISTS external_quote_reference TEXT,
  ADD COLUMN IF NOT EXISTS supplier_invoice_number_norm TEXT,
  ADD COLUMN IF NOT EXISTS third_party_job_card_number_norm TEXT,
  ADD COLUMN IF NOT EXISTS po_number_norm TEXT,
  ADD COLUMN IF NOT EXISTS external_quote_reference_norm TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sc_supplier_invoice_norm
  ON service_calls (supplier_invoice_number_norm)
  WHERE supplier_invoice_number_norm IS NOT NULL AND supplier_invoice_number_norm <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_sc_third_party_job_card_norm
  ON service_calls (third_party_job_card_number_norm)
  WHERE third_party_job_card_number_norm IS NOT NULL AND third_party_job_card_number_norm <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_sc_po_number_norm
  ON service_calls (po_number_norm)
  WHERE po_number_norm IS NOT NULL AND po_number_norm <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_sc_external_quote_norm
  ON service_calls (external_quote_reference_norm)
  WHERE external_quote_reference_norm IS NOT NULL AND external_quote_reference_norm <> '';

-- ============================================
-- service_call_quotes
-- ============================================
CREATE TABLE IF NOT EXISTS service_call_quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_call_id UUID NOT NULL REFERENCES service_calls(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL DEFAULT 1,
  supplier_name TEXT NOT NULL,
  quote_reference TEXT,
  quote_date DATE,
  amount NUMERIC(12, 2),
  currency TEXT DEFAULT 'ZAR',
  description TEXT,
  document_id UUID REFERENCES service_call_documents(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'superseded')),
  decision_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  decision_at TIMESTAMPTZ,
  decision_reason TEXT,
  next_step TEXT CHECK (next_step IS NULL OR next_step IN ('revise_same_supplier', 'different_supplier')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (service_call_id, revision)
);

CREATE INDEX IF NOT EXISTS idx_sc_quotes_sc ON service_call_quotes(service_call_id);
CREATE INDEX IF NOT EXISTS idx_sc_quotes_status ON service_call_quotes(status);
CREATE INDEX IF NOT EXISTS idx_sc_quotes_ref ON service_call_quotes(quote_reference);

-- ============================================
-- Duplicate override decisions (audit)
-- ============================================
CREATE TABLE IF NOT EXISTS service_call_duplicate_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_call_id UUID REFERENCES service_calls(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  match_criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  matched_service_call_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sc_dup_decisions_created ON service_call_duplicate_decisions(created_at DESC);

-- ============================================
-- RLS
-- ============================================
ALTER TABLE service_call_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_call_duplicate_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scq_select" ON service_call_quotes;
CREATE POLICY "scq_select" ON service_call_quotes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM service_calls sc
    WHERE sc.id = service_call_id AND can_access_service_call(sc)
  ));

DROP POLICY IF EXISTS "scq_insert" ON service_call_quotes;
CREATE POLICY "scq_insert" ON service_call_quotes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM service_calls sc
    WHERE sc.id = service_call_id AND can_access_service_call(sc)
  ));

DROP POLICY IF EXISTS "scq_update" ON service_call_quotes;
CREATE POLICY "scq_update" ON service_call_quotes FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM service_calls sc
    WHERE sc.id = service_call_id AND can_access_service_call(sc)
  ));

DROP POLICY IF EXISTS "scdd_select" ON service_call_duplicate_decisions;
CREATE POLICY "scdd_select" ON service_call_duplicate_decisions FOR SELECT
  USING (is_service_call_admin() OR actor_id = auth.uid());

DROP POLICY IF EXISTS "scdd_insert" ON service_call_duplicate_decisions;
CREATE POLICY "scdd_insert" ON service_call_duplicate_decisions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND actor_id = auth.uid());
