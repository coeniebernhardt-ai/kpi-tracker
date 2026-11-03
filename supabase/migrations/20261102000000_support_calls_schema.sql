-- Support Calls — new HTO-owned operational module
-- Run AFTER SUPPORT_CALLS_DROP_LEGACY.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_hto BOOLEAN DEFAULT FALSE;

-- ============================================
-- Partner directory
-- ============================================
CREATE TABLE IF NOT EXISTS support_partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  telephone TEXT,
  category TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- support_calls
-- ============================================
CREATE TABLE IF NOT EXISTS support_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  support_call_number TEXT NOT NULL UNIQUE,
  ticket_id UUID NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE RESTRICT,
  hto_owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'Medium'
    CHECK (priority IN ('Critical', 'High', 'Medium', 'Low')),
  overall_status TEXT NOT NULL DEFAULT 'open'
    CHECK (overall_status IN ('open', 'closed', 'cancelled')),
  workflow_stage TEXT NOT NULL DEFAULT 'logged',
  -- Original report (immutable description after create; supplements via audit)
  report_method TEXT,
  reporter_name TEXT,
  reporter_organisation TEXT,
  reporter_email TEXT,
  reporter_phone TEXT,
  reported_at TIMESTAMPTZ,
  original_description TEXT NOT NULL,
  operational_description TEXT,
  -- Site / responsible person snapshots (do not overwrite master records)
  client TEXT,
  site_name TEXT,
  estate_or_building TEXT,
  cml_location TEXT,
  location TEXT CHECK (location IS NULL OR location IN ('on-site', 'remote')),
  responsible_name TEXT,
  responsible_position TEXT,
  responsible_organisation TEXT,
  responsible_email TEXT,
  responsible_phone TEXT,
  -- Notification checkpoints (derived display also from communications table)
  initial_notification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (initial_notification_status IN ('pending', 'complete', 'attempted')),
  eta_notification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (eta_notification_status IN ('pending', 'complete', 'attempted')),
  -- External refs (dedupe)
  supplier_invoice_number TEXT,
  third_party_job_card_number TEXT,
  po_number TEXT,
  external_quote_reference TEXT,
  supplier_invoice_number_norm TEXT,
  third_party_job_card_number_norm TEXT,
  po_number_norm TEXT,
  external_quote_reference_norm TEXT,
  -- Closure / cancel
  cancel_reason TEXT,
  cancel_explanation TEXT,
  cancel_ticket_action TEXT CHECK (cancel_ticket_action IS NULL OR cancel_ticket_action IN ('close', 'leave_open')),
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_calls_hto ON support_calls(hto_owner_id);
CREATE INDEX IF NOT EXISTS idx_support_calls_status ON support_calls(overall_status);
CREATE INDEX IF NOT EXISTS idx_support_calls_stage ON support_calls(workflow_stage);
CREATE INDEX IF NOT EXISTS idx_support_calls_created ON support_calls(created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_scall_supplier_invoice_norm
  ON support_calls (supplier_invoice_number_norm)
  WHERE supplier_invoice_number_norm IS NOT NULL AND supplier_invoice_number_norm <> '';
CREATE UNIQUE INDEX IF NOT EXISTS uq_scall_third_party_jc_norm
  ON support_calls (third_party_job_card_number_norm)
  WHERE third_party_job_card_number_norm IS NOT NULL AND third_party_job_card_number_norm <> '';
CREATE UNIQUE INDEX IF NOT EXISTS uq_scall_po_norm
  ON support_calls (po_number_norm)
  WHERE po_number_norm IS NOT NULL AND po_number_norm <> '';
CREATE UNIQUE INDEX IF NOT EXISTS uq_scall_quote_ref_norm
  ON support_calls (external_quote_reference_norm)
  WHERE external_quote_reference_norm IS NOT NULL AND external_quote_reference_norm <> '';

CREATE TABLE IF NOT EXISTS support_call_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  support_call_id UUID NOT NULL REFERENCES support_calls(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_lead BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  started_work_at TIMESTAMPTZ,
  first_update_at TIMESTAMPTZ,
  first_submitted_at TIMESTAMPTZ,
  UNIQUE (support_call_id, member_id)
);

CREATE TABLE IF NOT EXISTS support_call_partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  support_call_id UUID NOT NULL REFERENCES support_calls(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES support_partners(id) ON DELETE SET NULL,
  is_once_off BOOLEAN NOT NULL DEFAULT FALSE,
  company_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  telephone TEXT,
  category TEXT,
  notes TEXT,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  arrival_confirmed_at TIMESTAMPTZ,
  arrival_confirmed_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS support_call_communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  support_call_id UUID NOT NULL REFERENCES support_calls(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('initial_notification', 'eta_notification', 'partner_contact', 'other')),
  outcome TEXT NOT NULL CHECK (outcome IN ('complete', 'attempted')),
  method TEXT NOT NULL CHECK (method IN ('Email', 'Telephone', 'WhatsApp', 'Other')),
  recipient_name TEXT,
  recipient_contact TEXT,
  eta_at TIMESTAMPTZ,
  communicated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  failure_reason TEXT,
  confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_call_eta_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  support_call_id UUID NOT NULL REFERENCES support_calls(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES support_call_assignments(id) ON DELETE SET NULL,
  partner_assignment_id UUID REFERENCES support_call_partners(id) ON DELETE SET NULL,
  previous_eta TIMESTAMPTZ,
  new_eta TIMESTAMPTZ NOT NULL,
  source TEXT,
  notes TEXT,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_call_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  support_call_id UUID NOT NULL REFERENCES support_calls(id) ON DELETE CASCADE,
  visit_number INTEGER NOT NULL,
  party_type TEXT NOT NULL CHECK (party_type IN ('internal', 'external')),
  assignment_id UUID REFERENCES support_call_assignments(id) ON DELETE SET NULL,
  partner_assignment_id UUID REFERENCES support_call_partners(id) ON DELETE SET NULL,
  visit_date DATE,
  arrived_at TIMESTAMPTZ,
  departed_at TIMESTAMPTZ,
  labour_minutes INTEGER,
  travel_km NUMERIC(10, 2),
  travel_amount_zar NUMERIC(12, 2),
  external_travel_cost_zar NUMERIC(12, 2),
  diagnosis TEXT,
  work_performed TEXT,
  test_results TEXT,
  incomplete BOOLEAN NOT NULL DEFAULT FALSE,
  incomplete_reason TEXT,
  dependency_notes TEXT,
  expected_follow_up_date DATE,
  next_action_party TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (support_call_id, visit_number)
);

CREATE TABLE IF NOT EXISTS support_call_hardware_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  support_call_id UUID NOT NULL REFERENCES support_calls(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES support_call_visits(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  make_model TEXT,
  quantity NUMERIC(10, 2) DEFAULT 1,
  old_equipment TEXT,
  new_equipment TEXT,
  old_mac TEXT,
  new_mac TEXT,
  serial_number TEXT,
  replacement_reason TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_call_contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  support_call_id UUID NOT NULL REFERENCES support_calls(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES support_call_assignments(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'returned', 'approved')),
  summary TEXT,
  confirmed_accurate BOOLEAN NOT NULL DEFAULT FALSE,
  correction_notes TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assignment_id, revision)
);

CREATE TABLE IF NOT EXISTS support_call_quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  support_call_id UUID NOT NULL REFERENCES support_calls(id) ON DELETE CASCADE,
  partner_assignment_id UUID REFERENCES support_call_partners(id) ON DELETE SET NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  supplier_name TEXT NOT NULL,
  quote_reference TEXT,
  quote_date DATE,
  description TEXT,
  amount NUMERIC(12, 2),
  currency TEXT DEFAULT 'ZAR',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'superseded')),
  decision_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  decision_at TIMESTAMPTZ,
  decision_reason TEXT,
  next_step TEXT CHECK (next_step IS NULL OR next_step IN ('revise_same_supplier', 'different_supplier')),
  document_id UUID,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (support_call_id, revision, supplier_name)
);

CREATE TABLE IF NOT EXISTS support_call_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  support_call_id UUID NOT NULL REFERENCES support_calls(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL DEFAULT 'other',
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  related_visit_id UUID REFERENCES support_call_visits(id) ON DELETE SET NULL,
  related_quote_id UUID REFERENCES support_call_quotes(id) ON DELETE SET NULL,
  related_job_card_id UUID,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_call_job_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  support_call_id UUID NOT NULL REFERENCES support_calls(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready', 'awaiting_signature', 'signed', 'superseded')),
  pdf_storage_path TEXT,
  signed_pdf_storage_path TEXT,
  generated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (support_call_id, version)
);

ALTER TABLE support_call_documents
  DROP CONSTRAINT IF EXISTS support_call_documents_related_job_card_id_fkey;
ALTER TABLE support_call_documents
  ADD CONSTRAINT support_call_documents_related_job_card_id_fkey
  FOREIGN KEY (related_job_card_id) REFERENCES support_call_job_cards(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS support_call_signing_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  support_call_id UUID NOT NULL REFERENCES support_calls(id) ON DELETE CASCADE,
  job_card_id UUID NOT NULL REFERENCES support_call_job_cards(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_call_signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  support_call_id UUID NOT NULL REFERENCES support_calls(id) ON DELETE CASCADE,
  job_card_id UUID NOT NULL REFERENCES support_call_job_cards(id) ON DELETE CASCADE,
  signer_name TEXT NOT NULL,
  signer_position TEXT,
  signer_company TEXT,
  signature_data TEXT NOT NULL,
  confirmed BOOLEAN NOT NULL DEFAULT TRUE,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_hint TEXT
);

CREATE TABLE IF NOT EXISTS support_call_signature_exceptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  support_call_id UUID NOT NULL REFERENCES support_calls(id) ON DELETE CASCADE,
  job_card_id UUID REFERENCES support_call_job_cards(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (reason IN ('Unavailable', 'Refused', 'Disputed work', 'Other')),
  interaction_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  method TEXT,
  explanation TEXT NOT NULL,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_call_finance_handovers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  support_call_id UUID NOT NULL REFERENCES support_calls(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  report_storage_path TEXT,
  generated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ,
  downloaded_at TIMESTAMPTZ,
  downloaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  sent_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  sent_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  finance_recipient TEXT,
  communication_method TEXT,
  email_subject TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_call_audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  support_call_id UUID NOT NULL REFERENCES support_calls(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  related_id UUID,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_role TEXT,
  event_type TEXT NOT NULL,
  previous_value JSONB,
  new_value JSONB,
  reason TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scall_audit_sc ON support_call_audit_events(support_call_id, created_at DESC);

CREATE TABLE IF NOT EXISTS support_call_duplicate_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  support_call_id UUID REFERENCES support_calls(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  match_criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  matched_support_call_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_support_calls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_support_calls_updated_at ON support_calls;
CREATE TRIGGER trg_support_calls_updated_at
  BEFORE UPDATE ON support_calls
  FOR EACH ROW EXECUTE FUNCTION set_support_calls_updated_at();

-- RLS helpers
CREATE OR REPLACE FUNCTION is_support_call_manager()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.is_active = TRUE AND (p.is_admin = TRUE OR p.is_hto = TRUE)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_support_call_assignee(sc_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM support_call_assignments a
    WHERE a.support_call_id = sc_id AND a.member_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

ALTER TABLE support_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_call_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_call_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_call_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_call_eta_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_call_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_call_hardware_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_call_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_call_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_call_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_call_job_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_call_signing_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_call_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_call_signature_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_call_finance_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_call_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_call_duplicate_decisions ENABLE ROW LEVEL SECURITY;

-- Managers full access; assignees select related rows; audit insert for actors
DROP POLICY IF EXISTS "sp_all_mgr" ON support_partners;
CREATE POLICY "sp_all_mgr" ON support_partners FOR ALL USING (is_support_call_manager()) WITH CHECK (is_support_call_manager());

DROP POLICY IF EXISTS "sc_select" ON support_calls;
CREATE POLICY "sc_select" ON support_calls FOR SELECT
  USING (is_support_call_manager() OR is_support_call_assignee(id) OR hto_owner_id = auth.uid());
DROP POLICY IF EXISTS "sc_write_mgr" ON support_calls;
CREATE POLICY "sc_write_mgr" ON support_calls FOR ALL USING (is_support_call_manager()) WITH CHECK (is_support_call_manager());

DROP POLICY IF EXISTS "sca_select" ON support_call_assignments;
CREATE POLICY "sca_select" ON support_call_assignments FOR SELECT
  USING (is_support_call_manager() OR member_id = auth.uid());
DROP POLICY IF EXISTS "sca_write_mgr" ON support_call_assignments;
CREATE POLICY "sca_write_mgr" ON support_call_assignments FOR ALL USING (is_support_call_manager()) WITH CHECK (is_support_call_manager());

-- Child tables: managers all; assignees select/insert/update own related via assignment
DROP POLICY IF EXISTS "scv_all" ON support_call_visits;
CREATE POLICY "scv_all" ON support_call_visits FOR ALL
  USING (is_support_call_manager() OR is_support_call_assignee(support_call_id))
  WITH CHECK (is_support_call_manager() OR is_support_call_assignee(support_call_id));

DROP POLICY IF EXISTS "sch_all" ON support_call_hardware_items;
CREATE POLICY "sch_all" ON support_call_hardware_items FOR ALL
  USING (is_support_call_manager() OR is_support_call_assignee(support_call_id))
  WITH CHECK (is_support_call_manager() OR is_support_call_assignee(support_call_id));

DROP POLICY IF EXISTS "scc_all" ON support_call_contributions;
CREATE POLICY "scc_all" ON support_call_contributions FOR ALL
  USING (is_support_call_manager() OR is_support_call_assignee(support_call_id))
  WITH CHECK (is_support_call_manager() OR is_support_call_assignee(support_call_id));

DROP POLICY IF EXISTS "scd_all" ON support_call_documents;
CREATE POLICY "scd_all" ON support_call_documents FOR ALL
  USING (is_support_call_manager() OR is_support_call_assignee(support_call_id))
  WITH CHECK (is_support_call_manager() OR is_support_call_assignee(support_call_id));

DROP POLICY IF EXISTS "sc_mgr_child_partners" ON support_call_partners;
CREATE POLICY "sc_mgr_child_partners" ON support_call_partners FOR ALL USING (is_support_call_manager()) WITH CHECK (is_support_call_manager());
DROP POLICY IF EXISTS "sc_mgr_comms" ON support_call_communications;
CREATE POLICY "sc_mgr_comms" ON support_call_communications FOR ALL USING (is_support_call_manager()) WITH CHECK (is_support_call_manager());
DROP POLICY IF EXISTS "sc_mgr_eta" ON support_call_eta_events;
CREATE POLICY "sc_mgr_eta" ON support_call_eta_events FOR ALL
  USING (is_support_call_manager() OR is_support_call_assignee(support_call_id))
  WITH CHECK (is_support_call_manager() OR is_support_call_assignee(support_call_id));
DROP POLICY IF EXISTS "sc_mgr_quotes" ON support_call_quotes;
CREATE POLICY "sc_mgr_quotes" ON support_call_quotes FOR ALL USING (is_support_call_manager()) WITH CHECK (is_support_call_manager());
DROP POLICY IF EXISTS "sc_mgr_jc" ON support_call_job_cards;
CREATE POLICY "sc_mgr_jc" ON support_call_job_cards FOR ALL USING (is_support_call_manager()) WITH CHECK (is_support_call_manager());
DROP POLICY IF EXISTS "sc_mgr_tokens" ON support_call_signing_tokens;
CREATE POLICY "sc_mgr_tokens" ON support_call_signing_tokens FOR ALL USING (is_support_call_manager()) WITH CHECK (is_support_call_manager());
DROP POLICY IF EXISTS "sc_mgr_sigs" ON support_call_signatures;
CREATE POLICY "sc_mgr_sigs" ON support_call_signatures FOR SELECT USING (is_support_call_manager());
DROP POLICY IF EXISTS "sc_mgr_sig_ex" ON support_call_signature_exceptions;
CREATE POLICY "sc_mgr_sig_ex" ON support_call_signature_exceptions FOR ALL USING (is_support_call_manager()) WITH CHECK (is_support_call_manager());
DROP POLICY IF EXISTS "sc_mgr_fin" ON support_call_finance_handovers;
CREATE POLICY "sc_mgr_fin" ON support_call_finance_handovers FOR ALL USING (is_support_call_manager()) WITH CHECK (is_support_call_manager());
DROP POLICY IF EXISTS "sc_audit_select" ON support_call_audit_events;
CREATE POLICY "sc_audit_select" ON support_call_audit_events FOR SELECT USING (is_support_call_manager());
DROP POLICY IF EXISTS "sc_audit_insert" ON support_call_audit_events;
CREATE POLICY "sc_audit_insert" ON support_call_audit_events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "sc_dup_all" ON support_call_duplicate_decisions;
CREATE POLICY "sc_dup_all" ON support_call_duplicate_decisions FOR ALL USING (is_support_call_manager()) WITH CHECK (is_support_call_manager());

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-call-documents', 'support-call-documents', false)
ON CONFLICT (id) DO NOTHING;
