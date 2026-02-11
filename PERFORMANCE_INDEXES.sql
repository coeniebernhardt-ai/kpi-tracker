-- Performance indexes for dashboard and notifications. Preserve existing data.
-- Run in Supabase SQL Editor (Preview). Add only if not exists.

-- Tickets: status and assigned user (user_id) for filtering and metrics
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);

-- Notifications: recipient (user_id) for member inbox and admin queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- Notification reactions: by notification for aggregation
CREATE INDEX IF NOT EXISTS idx_notification_reactions_notification_id ON notification_reactions(notification_id);
