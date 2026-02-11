-- Notification reactions: one reaction per user per notification.
-- Unique (notification_id, user_id) enforces single reaction; toggle = delete, change = update.
-- Run in Supabase SQL Editor (Preview). Do NOT modify existing notifications table.

CREATE TABLE IF NOT EXISTS notification_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('LIKE', 'MUSCLE', 'LAUGH', 'COPY_THAT')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(notification_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_reactions_notification_id ON notification_reactions(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_reactions_user_id ON notification_reactions(user_id);

ALTER TABLE notification_reactions ENABLE ROW LEVEL SECURITY;

-- Members can only insert/update/delete their own reaction (user_id = auth.uid()).
CREATE POLICY "Users can view reactions on notifications they can access"
  ON notification_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.id = notification_reactions.notification_id
      AND (n.user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE))
    )
  );

CREATE POLICY "Users can insert own reaction"
  ON notification_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reaction"
  ON notification_reactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reaction"
  ON notification_reactions FOR DELETE
  USING (auth.uid() = user_id);
