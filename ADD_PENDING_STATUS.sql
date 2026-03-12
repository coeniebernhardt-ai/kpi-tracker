-- ============================================
-- ADD PENDING STATUS (ThinkQ email-to-ticket)
-- Run in Supabase SQL Editor after tickets table exists.
-- Valid statuses: pending, open, closed.
-- Pending = not yet assigned to a technician.
-- ============================================

-- Allow status 'pending' (drop existing check and re-add)
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check
  CHECK (status IN ('pending', 'open', 'closed'));

-- Ensure default remains 'open' for manual tickets; email-created pending tickets set status explicitly
-- (No change to default needed; new rows from email set status = 'pending' or 'open' in app.)
