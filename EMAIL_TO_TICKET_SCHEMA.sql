-- ============================================
-- EMAIL-TO-TICKET INTEGRATION (ThinkQ)
-- Run in Supabase SQL Editor after main schema.
-- ============================================

-- Support mailboxes (configurable per brand)
CREATE TABLE IF NOT EXISTS support_mailboxes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mailbox_address TEXT NOT NULL UNIQUE,
  imap_server TEXT NOT NULL,
  imap_port INTEGER NOT NULL DEFAULT 993,
  smtp_server TEXT NOT NULL,
  smtp_port INTEGER NOT NULL DEFAULT 587,
  username TEXT NOT NULL,
  password_encrypted TEXT,
  default_assigned_agent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Duplicate protection: store message_id of every processed email
CREATE TABLE IF NOT EXISTS processed_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id TEXT NOT NULL UNIQUE,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processed_emails_message_id ON processed_emails(message_id);

-- Event logging for email pipeline
CREATE TABLE IF NOT EXISTS email_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  mailbox_address TEXT,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  message_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_log_event_type ON email_log(event_type);
CREATE INDEX IF NOT EXISTS idx_email_log_created_at ON email_log(created_at);

-- Add email-origin columns to tickets (nullable for existing rows)
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ticket_source TEXT DEFAULT 'manual';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ticket_mailbox TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS client_email TEXT;

COMMENT ON COLUMN tickets.ticket_source IS 'manual | email';
COMMENT ON COLUMN tickets.ticket_mailbox IS 'Receiving support mailbox address (for outbound reply FROM)';
COMMENT ON COLUMN tickets.client_email IS 'Client email (for outbound reply TO); set when ticket_source=email';

-- RLS: only service role / admin should manage mailboxes and processed_emails (use service role in API)
ALTER TABLE support_mailboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access support_mailboxes"
  ON support_mailboxes FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access processed_emails"
  ON processed_emails FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access email_log"
  ON email_log FOR ALL USING (true) WITH CHECK (true);
