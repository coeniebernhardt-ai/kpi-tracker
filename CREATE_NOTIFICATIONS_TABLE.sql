-- FEATURE C: Notifications table for member notifications.
-- Backward-compatible: new table only, no changes to existing tables.
-- Run in Supabase SQL Editor (Dashboard > SQL Editor > New Query).

-- Notifications: append-only; each row is one notification for one user.
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('admin_comment', 'added_to_ticket')),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  triggering_user_role TEXT NOT NULL CHECK (triggering_user_role IN ('admin', 'member')),
  triggering_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see and update their own notifications.
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications (e.g. mark read)"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Any authenticated user can insert (used when admin/member performs an action that notifies others).
CREATE POLICY "Authenticated users can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- No DELETE policy: append-only; old notifications can be kept or pruned by a scheduled job if needed.
