-- FEATURE A: Admin push notifications with optional image.
-- Extends notifications table for type admin_broadcast (no ticket; optional title, message, image).
-- Run in Supabase SQL Editor. Existing data remains intact.

-- Allow admin_broadcast type and make ticket_id nullable for broadcast notifications
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('admin_comment', 'added_to_ticket', 'admin_broadcast'));

ALTER TABLE notifications ALTER COLUMN ticket_id DROP NOT NULL;

-- Optional columns for admin_broadcast: title, message, image_url (store reference only)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Backfill: existing rows keep ticket_id; new admin_broadcast rows use message/title/image_url
COMMENT ON COLUMN notifications.message IS 'Required for admin_broadcast; null for ticket-based types';
COMMENT ON COLUMN notifications.image_url IS 'Optional image URL for admin_broadcast; server-validated upload or external URL';
