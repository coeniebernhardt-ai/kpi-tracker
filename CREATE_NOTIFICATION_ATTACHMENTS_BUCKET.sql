-- Create the private bucket for notification attachments.
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Do NOT run NOTIFICATION_ATTACHMENTS_BUCKET.md – that is documentation (Markdown), not SQL.

INSERT INTO storage.buckets (id, name, public)
VALUES ('notification-attachments', 'notification-attachments', false)
ON CONFLICT (id) DO UPDATE SET public = false;
