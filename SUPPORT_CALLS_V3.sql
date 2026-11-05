-- =============================================================================
-- SUPPORT CALLS V3 — additive (run manually in Supabase SQL editor)
-- Prerequisites: SUPPORT_CALLS_SCHEMA.sql + SUPPORT_CALLS_V2.sql
-- =============================================================================

-- Member completion (no HTO accept required for work to count as done)
ALTER TABLE support_call_assignments
  ADD COLUMN IF NOT EXISTS work_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS work_completed_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sca_work_completed
  ON support_call_assignments(support_call_id, work_completed_at);

-- Partner work completion (HTO records)
ALTER TABLE support_call_partners
  ADD COLUMN IF NOT EXISTS work_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS work_completed_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Sync conflicts (offline vs online)
CREATE TABLE IF NOT EXISTS support_call_sync_conflicts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  support_call_id UUID NOT NULL REFERENCES support_calls(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  client_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  server_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'resolved')),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sc_sync_conflicts_sc
  ON support_call_sync_conflicts(support_call_id, status, created_at DESC);

ALTER TABLE support_call_sync_conflicts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sc_sync_conflicts_mgr" ON support_call_sync_conflicts;
CREATE POLICY "sc_sync_conflicts_mgr" ON support_call_sync_conflicts FOR ALL
  USING (is_support_call_manager()) WITH CHECK (is_support_call_manager());
DROP POLICY IF EXISTS "sc_sync_conflicts_insert_assignee" ON support_call_sync_conflicts;
CREATE POLICY "sc_sync_conflicts_insert_assignee" ON support_call_sync_conflicts FOR INSERT
  WITH CHECK (is_support_call_manager() OR is_support_call_assignee(support_call_id));

-- Better realtime delivery for filtered child tables
DO $$
BEGIN
  BEGIN ALTER TABLE support_call_assignments REPLICA IDENTITY FULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE support_call_visits REPLICA IDENTITY FULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE support_call_contributions REPLICA IDENTITY FULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE support_call_hardware_items REPLICA IDENTITY FULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE support_call_eta_events REPLICA IDENTITY FULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE support_call_documents REPLICA IDENTITY FULL; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- Ensure realtime publication includes key tables (idempotent)
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE support_call_sync_conflicts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
