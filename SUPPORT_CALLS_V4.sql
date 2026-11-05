-- =============================================================================
-- SUPPORT CALLS V4 — additive (run manually in Supabase SQL editor)
-- Prerequisites: SUPPORT_CALLS_SCHEMA.sql + SUPPORT_CALLS_V2.sql + SUPPORT_CALLS_V3.sql
-- =============================================================================

-- Reporter simplification
ALTER TABLE support_calls
  ADD COLUMN IF NOT EXISTS reporter_contact TEXT,
  ADD COLUMN IF NOT EXISTS client_houston_userid TEXT,
  ADD COLUMN IF NOT EXISTS eta_sent_event_id UUID,
  ADD COLUMN IF NOT EXISTS eta_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS eta_sent_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS partner_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS partner_required_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS partner_required_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS partner_required_reason TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'support_calls_eta_sent_event_id_fkey'
  ) THEN
    ALTER TABLE support_calls
      ADD CONSTRAINT support_calls_eta_sent_event_id_fkey
      FOREIGN KEY (eta_sent_event_id) REFERENCES support_call_eta_events(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Backfill reporter_contact from legacy email/phone where empty
UPDATE support_calls
SET reporter_contact = COALESCE(NULLIF(TRIM(reporter_email), ''), NULLIF(TRIM(reporter_phone), ''))
WHERE reporter_contact IS NULL
  AND (NULLIF(TRIM(reporter_email), '') IS NOT NULL OR NULLIF(TRIM(reporter_phone), '') IS NOT NULL);

-- Contribution / completion category for partner referral
ALTER TABLE support_call_contributions
  ADD COLUMN IF NOT EXISTS referred_to_partner BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS referral_reason TEXT,
  ADD COLUMN IF NOT EXISTS completion_category TEXT
    CHECK (completion_category IS NULL OR completion_category IN ('completed', 'completed_referred_to_partner'));

ALTER TABLE support_call_assignments
  ADD COLUMN IF NOT EXISTS referred_to_partner BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS referral_reason TEXT,
  ADD COLUMN IF NOT EXISTS completion_category TEXT
    CHECK (completion_category IS NULL OR completion_category IN ('completed', 'completed_referred_to_partner'));

-- Visit idempotency for offline retries
ALTER TABLE support_call_visits
  ADD COLUMN IF NOT EXISTS client_idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sc_visits_idempotency
  ON support_call_visits(support_call_id, client_idempotency_key)
  WHERE client_idempotency_key IS NOT NULL;
