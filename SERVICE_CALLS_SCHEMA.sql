-- Service Calls operational module
-- Run in Supabase SQL Editor. Does NOT drop or alter callout_* tables.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- service_calls
-- ============================================
CREATE TABLE IF NOT EXISTS service_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_call_number TEXT UNIQUE NOT NULL,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,

  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reported_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  coordinator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_technician_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  coordinator_role_label TEXT,

  client TEXT,
  site_name TEXT,
  estate_or_building TEXT,
  cml_location TEXT,
  location TEXT CHECK (location IS NULL OR location IN ('on-site', 'remote')),

  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  fault_summary TEXT,
  priority TEXT NOT NULL DEFAULT 'MEDIUM'
    CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  contract_ref TEXT,

  technical_status TEXT NOT NULL DEFAULT 'new'
    CHECK (technical_status IN (
      'new',
      'acknowledgement_pending',
      'in_triage',
      'remote_resolution',
      'awaiting_assignment',
      'awaiting_acceptance',
      'scheduled',
      'on_site',
      'awaiting_parts_quote_escalation',
      'return_visit_required',
      'repair_and_testing',
      'job_card_required',
      'job_card_correction_required',
      'ready_to_invoice',
      'awaiting_customer_confirmation',
      'closed',
      'cancelled'
    )),
  invoicing_status TEXT NOT NULL DEFAULT 'not_ready'
    CHECK (invoicing_status IN (
      'not_ready',
      'ready_to_invoice',
      'preparing_invoice',
      'awaiting_charge_review',
      'awaiting_additional_approval',
      'invoice_issued',
      'payment_outstanding',
      'partially_paid',
      'paid',
      'disputed',
      'voided'
    )),

  acknowledged_at TIMESTAMPTZ,
  assigned_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  eta_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  job_card_approved_at TIMESTAMPTZ,
  ready_to_invoice_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  remote_fix_possible BOOLEAN,
  remote_diagnosis TEXT,
  remote_resolution TEXT,

  escalation_reason TEXT,
  parts_required BOOLEAN DEFAULT FALSE,
  quotation_required BOOLEAN DEFAULT FALSE,
  quotation_notes TEXT,

  customer_signoff_obtained BOOLEAN,
  customer_signoff_notes TEXT,
  customer_feedback TEXT,
  confirmation_exception_reason TEXT,

  knowledge_notes TEXT,
  recurring_fault BOOLEAN DEFAULT FALSE,

  invoice_number TEXT,
  invoice_issued_at TIMESTAMPTZ,
  invoice_amount NUMERIC(12, 2),
  amount_paid NUMERIC(12, 2),
  payment_status_note TEXT,
  dispute_notes TEXT,

  cancel_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_calls_ticket_id ON service_calls(ticket_id);
CREATE INDEX IF NOT EXISTS idx_service_calls_assigned ON service_calls(assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_service_calls_technical_status ON service_calls(technical_status);
CREATE INDEX IF NOT EXISTS idx_service_calls_invoicing_status ON service_calls(invoicing_status);
CREATE INDEX IF NOT EXISTS idx_service_calls_created_at ON service_calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_calls_number ON service_calls(service_call_number);
CREATE INDEX IF NOT EXISTS idx_service_calls_created_by ON service_calls(created_by);

-- ============================================
-- service_call_visits
-- ============================================
CREATE TABLE IF NOT EXISTS service_call_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_call_id UUID NOT NULL REFERENCES service_calls(id) ON DELETE CASCADE,
  visit_number INTEGER NOT NULL DEFAULT 1,
  scheduled_at TIMESTAMPTZ,
  eta_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  departed_at TIMESTAMPTZ,
  diagnosis TEXT,
  work_performed TEXT,
  test_results TEXT,
  parts_used JSONB DEFAULT '[]'::jsonb,
  parts_none BOOLEAN DEFAULT FALSE,
  labour_minutes INTEGER,
  return_visit_required BOOLEAN DEFAULT FALSE,
  return_visit_reason TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (service_call_id, visit_number)
);

CREATE INDEX IF NOT EXISTS idx_service_call_visits_sc ON service_call_visits(service_call_id);

-- ============================================
-- service_call_job_cards
-- ============================================
CREATE TABLE IF NOT EXISTS service_call_job_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_call_id UUID NOT NULL REFERENCES service_calls(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'returned', 'accepted')),
  diagnosis TEXT,
  work_performed TEXT,
  labour_minutes INTEGER,
  parts_used JSONB DEFAULT '[]'::jsonb,
  parts_none BOOLEAN DEFAULT FALSE,
  test_results TEXT,
  evidence_notes TEXT,
  evidence_exception TEXT,
  customer_signoff_obtained BOOLEAN,
  customer_signoff_notes TEXT,
  signoff_exception TEXT,
  checklist_json JSONB DEFAULT '{}'::jsonb,
  correction_notes TEXT,
  submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_call_job_cards_sc ON service_call_job_cards(service_call_id);
CREATE INDEX IF NOT EXISTS idx_service_call_job_cards_status ON service_call_job_cards(status);

-- ============================================
-- service_call_documents
-- ============================================
CREATE TABLE IF NOT EXISTS service_call_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_call_id UUID NOT NULL REFERENCES service_calls(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_call_documents_sc ON service_call_documents(service_call_id);

-- ============================================
-- service_call_audit_log (append-only)
-- ============================================
CREATE TABLE IF NOT EXISTS service_call_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_call_id UUID NOT NULL REFERENCES service_calls(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  from_technical_status TEXT,
  to_technical_status TEXT,
  from_invoicing_status TEXT,
  to_invoicing_status TEXT,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT,
  payload_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_call_audit_sc ON service_call_audit_log(service_call_id, created_at DESC);

-- ============================================
-- service_call_comments
-- ============================================
CREATE TABLE IF NOT EXISTS service_call_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_call_id UUID NOT NULL REFERENCES service_calls(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_internal BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_call_comments_sc ON service_call_comments(service_call_id, created_at DESC);

-- ============================================
-- updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION set_service_calls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_service_calls_updated_at ON service_calls;
CREATE TRIGGER trg_service_calls_updated_at
  BEFORE UPDATE ON service_calls
  FOR EACH ROW EXECUTE PROCEDURE set_service_calls_updated_at();

DROP TRIGGER IF EXISTS trg_service_call_visits_updated_at ON service_call_visits;
CREATE TRIGGER trg_service_call_visits_updated_at
  BEFORE UPDATE ON service_call_visits
  FOR EACH ROW EXECUTE PROCEDURE set_service_calls_updated_at();

DROP TRIGGER IF EXISTS trg_service_call_job_cards_updated_at ON service_call_job_cards;
CREATE TRIGGER trg_service_call_job_cards_updated_at
  BEFORE UPDATE ON service_call_job_cards
  FOR EACH ROW EXECUTE PROCEDURE set_service_calls_updated_at();

-- ============================================
-- Helper: is admin
-- ============================================
CREATE OR REPLACE FUNCTION is_service_call_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_access_service_call(sc service_calls)
RETURNS BOOLEAN AS $$
  SELECT is_service_call_admin()
    OR sc.created_by = auth.uid()
    OR sc.reported_by = auth.uid()
    OR sc.coordinator_id = auth.uid()
    OR sc.assigned_technician_id = auth.uid();
$$ LANGUAGE sql STABLE;

-- ============================================
-- RLS
-- ============================================
ALTER TABLE service_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_call_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_call_job_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_call_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_call_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_call_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sc_select" ON service_calls;
CREATE POLICY "sc_select" ON service_calls FOR SELECT
  USING (can_access_service_call(service_calls));

DROP POLICY IF EXISTS "sc_insert" ON service_calls;
CREATE POLICY "sc_insert" ON service_calls FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (created_by = auth.uid() OR is_service_call_admin()));

DROP POLICY IF EXISTS "sc_update" ON service_calls;
CREATE POLICY "sc_update" ON service_calls FOR UPDATE
  USING (can_access_service_call(service_calls));

DROP POLICY IF EXISTS "sc_delete_admin" ON service_calls;
CREATE POLICY "sc_delete_admin" ON service_calls FOR DELETE
  USING (is_service_call_admin());

-- Visits
DROP POLICY IF EXISTS "scv_select" ON service_call_visits;
CREATE POLICY "scv_select" ON service_call_visits FOR SELECT
  USING (EXISTS (SELECT 1 FROM service_calls sc WHERE sc.id = service_call_id AND can_access_service_call(sc)));

DROP POLICY IF EXISTS "scv_insert" ON service_call_visits;
CREATE POLICY "scv_insert" ON service_call_visits FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM service_calls sc WHERE sc.id = service_call_id AND can_access_service_call(sc)));

DROP POLICY IF EXISTS "scv_update" ON service_call_visits;
CREATE POLICY "scv_update" ON service_call_visits FOR UPDATE
  USING (EXISTS (SELECT 1 FROM service_calls sc WHERE sc.id = service_call_id AND can_access_service_call(sc)));

-- Job cards
DROP POLICY IF EXISTS "scjc_select" ON service_call_job_cards;
CREATE POLICY "scjc_select" ON service_call_job_cards FOR SELECT
  USING (EXISTS (SELECT 1 FROM service_calls sc WHERE sc.id = service_call_id AND can_access_service_call(sc)));

DROP POLICY IF EXISTS "scjc_insert" ON service_call_job_cards;
CREATE POLICY "scjc_insert" ON service_call_job_cards FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM service_calls sc WHERE sc.id = service_call_id AND can_access_service_call(sc)));

DROP POLICY IF EXISTS "scjc_update" ON service_call_job_cards;
CREATE POLICY "scjc_update" ON service_call_job_cards FOR UPDATE
  USING (EXISTS (SELECT 1 FROM service_calls sc WHERE sc.id = service_call_id AND can_access_service_call(sc)));

-- Documents
DROP POLICY IF EXISTS "scd_select" ON service_call_documents;
CREATE POLICY "scd_select" ON service_call_documents FOR SELECT
  USING (EXISTS (SELECT 1 FROM service_calls sc WHERE sc.id = service_call_id AND can_access_service_call(sc)));

DROP POLICY IF EXISTS "scd_insert" ON service_call_documents;
CREATE POLICY "scd_insert" ON service_call_documents FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM service_calls sc WHERE sc.id = service_call_id AND can_access_service_call(sc)));

-- Audit: select scoped; insert scoped; no update/delete for normal users
DROP POLICY IF EXISTS "sca_select" ON service_call_audit_log;
CREATE POLICY "sca_select" ON service_call_audit_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM service_calls sc WHERE sc.id = service_call_id AND can_access_service_call(sc)));

DROP POLICY IF EXISTS "sca_insert" ON service_call_audit_log;
CREATE POLICY "sca_insert" ON service_call_audit_log FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM service_calls sc WHERE sc.id = service_call_id AND can_access_service_call(sc)));

-- Comments
DROP POLICY IF EXISTS "scc_select" ON service_call_comments;
CREATE POLICY "scc_select" ON service_call_comments FOR SELECT
  USING (EXISTS (SELECT 1 FROM service_calls sc WHERE sc.id = service_call_id AND can_access_service_call(sc)));

DROP POLICY IF EXISTS "scc_insert" ON service_call_comments;
CREATE POLICY "scc_insert" ON service_call_comments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM service_calls sc WHERE sc.id = service_call_id AND can_access_service_call(sc)));

-- Extend notifications types for service-call events (safe if already altered)
DO $$
BEGIN
  -- Drop old check if present and recreate broader set; ignore if column unconstrained differently
  ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'admin_comment',
    'added_to_ticket',
    'admin_broadcast',
    'service_call_triage',
    'service_call_assigned',
    'service_call_accepted',
    'service_call_job_card_submitted',
    'service_call_job_card_returned',
    'service_call_ready_to_invoice',
    'service_call_escalation'
  ));

-- ticket_id may be null for SC notifications that are not ticket-linked
ALTER TABLE notifications ALTER COLUMN ticket_id DROP NOT NULL;
