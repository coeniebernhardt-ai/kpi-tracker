-- Soft delete: hide notifications from UI and export; admin-only. Preserve existing data.
-- Attachments: multi-file per notification; secure serving via record-level auth.
-- Run in Supabase SQL Editor (Preview).

-- Soft delete: nullable deleted_at; when set, hide from lists and export
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_deleted_at ON notifications(deleted_at) WHERE deleted_at IS NULL;

-- RLS: hide soft-deleted from members (recreate policy to include deleted_at IS NULL)
-- Run once; if "Users can view own notifications" exists, drop it first in SQL Editor then run this file, or run the DROP + CREATE manually.
-- CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

-- notification_attachments: one row per file per notification; on notification delete remove records (and clean storage in app)
CREATE TABLE IF NOT EXISTS notification_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_attachments_notification_id ON notification_attachments(notification_id);

ALTER TABLE notification_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments of notifications they can access"
  ON notification_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.id = notification_attachments.notification_id
      AND n.deleted_at IS NULL
      AND (n.user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE))
    )
  );

-- Insert/update/delete: use service role in API (bypasses RLS). No further policies needed.
