-- Parts 3–4: broadcast grouping and read analytics.
-- Adds broadcast_group_id (group per admin send) and read_at (for delivery/read analytics).
-- Run in Supabase SQL Editor. Existing data remains intact.

-- Group id: same value for all notifications created in one admin broadcast send
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS broadcast_group_id UUID;

-- Read timestamp: set when notification is marked read (for analytics)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_notifications_broadcast_group_id ON notifications(broadcast_group_id) WHERE broadcast_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at) WHERE read_at IS NOT NULL;

COMMENT ON COLUMN notifications.broadcast_group_id IS 'Groups notifications from one admin broadcast send for history and analytics';
COMMENT ON COLUMN notifications.read_at IS 'When the recipient marked the notification as read; null = unread';
