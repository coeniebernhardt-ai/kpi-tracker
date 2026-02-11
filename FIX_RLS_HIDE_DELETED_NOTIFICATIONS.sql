-- Hide soft-deleted notifications from members at the database level.
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- After this, members will never see notifications where deleted_at IS NOT NULL.

-- Use public schema explicitly so the policy targets the correct table
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);
