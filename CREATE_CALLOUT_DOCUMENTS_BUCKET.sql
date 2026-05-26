-- Private bucket for Contractor Callout Intelligence PDFs.
-- Run in Supabase SQL Editor.

INSERT INTO storage.buckets (id, name, public)
VALUES ('callout-documents', 'callout-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;
