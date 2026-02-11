-- Hide soft-deleted notifications from members at the database level.
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- After this, members will never see notifications where deleted_at IS NOT NULL.

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);
