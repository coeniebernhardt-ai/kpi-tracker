-- Private bucket for Service Call evidence / job-card attachments.
-- Run in Supabase SQL Editor.

INSERT INTO storage.buckets (id, name, public)
VALUES ('service-call-documents', 'service-call-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;
