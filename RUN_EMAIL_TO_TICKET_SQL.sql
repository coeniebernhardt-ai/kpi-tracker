-- ============================================
-- RUN IN SUPABASE SQL EDITOR (one block or step by step)
-- Order: 1) Schema  2) Routing  3) Mailboxes
-- ============================================

-- ========== STEP 1: EMAIL_TO_TICKET_SCHEMA ==========
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

CREATE TABLE IF NOT EXISTS processed_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id TEXT NOT NULL UNIQUE,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_processed_emails_message_id ON processed_emails(message_id);

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

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ticket_source TEXT DEFAULT 'manual';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ticket_mailbox TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS client_email TEXT;

ALTER TABLE support_mailboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access support_mailboxes" ON support_mailboxes;
CREATE POLICY "Service role full access support_mailboxes" ON support_mailboxes FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access processed_emails" ON processed_emails;
CREATE POLICY "Service role full access processed_emails" ON processed_emails FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access email_log" ON email_log;
CREATE POLICY "Service role full access email_log" ON email_log FOR ALL USING (true) WITH CHECK (true);


-- ========== STEP 2: EMAIL_TO_TICKET_ROUTING_SCHEMA ==========
CREATE SEQUENCE IF NOT EXISTS ticket_display_id_seq;

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS display_id INTEGER UNIQUE;

CREATE OR REPLACE FUNCTION set_ticket_display_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.display_id IS NULL THEN
    NEW.display_id := nextval('ticket_display_id_seq');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS set_ticket_display_id_trigger ON tickets;
CREATE TRIGGER set_ticket_display_id_trigger
  BEFORE INSERT ON tickets FOR EACH ROW EXECUTE FUNCTION set_ticket_display_id();

CREATE TABLE IF NOT EXISTS sender_estate (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_address TEXT NOT NULL UNIQUE,
  estate_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sender_estate_email ON sender_estate(email_address);

CREATE TABLE IF NOT EXISTS routing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_address TEXT,
  email_domain TEXT,
  assigned_agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT routing_rule_email_or_domain CHECK (email_address IS NOT NULL OR email_domain IS NOT NULL)
);
ALTER TABLE routing_rules DROP CONSTRAINT IF EXISTS routing_rules_email_address_key;
ALTER TABLE routing_rules ADD CONSTRAINT routing_rules_email_address_key UNIQUE (email_address);
CREATE INDEX IF NOT EXISTS idx_routing_rules_domain ON routing_rules(email_domain) WHERE email_domain IS NOT NULL;

ALTER TABLE sender_estate ENABLE ROW LEVEL SECURITY;
ALTER TABLE routing_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access sender_estate" ON sender_estate;
CREATE POLICY "Service role full access sender_estate" ON sender_estate FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access routing_rules" ON routing_rules;
CREATE POLICY "Service role full access routing_rules" ON routing_rules FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION learn_routing_rule()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE agent_id UUID; dom TEXT;
BEGIN
  IF NEW.client_email IS NULL OR TRIM(NEW.client_email) = '' THEN RETURN NEW; END IF;
  IF (OLD.assigned_to_array IS NOT DISTINCT FROM NEW.assigned_to_array) AND (OLD.user_id IS NOT DISTINCT FROM NEW.user_id) THEN RETURN NEW; END IF;
  agent_id := NEW.user_id;
  IF agent_id IS NULL AND array_length(NEW.assigned_to_array, 1) > 0 THEN agent_id := NEW.assigned_to_array[1]; END IF;
  IF agent_id IS NULL THEN RETURN NEW; END IF;
  dom := LOWER(TRIM(SPLIT_PART(NEW.client_email, '@', 2)));
  IF dom = '' THEN dom := NULL; END IF;
  INSERT INTO routing_rules (email_address, email_domain, assigned_agent_id, updated_at)
  VALUES (LOWER(TRIM(NEW.client_email)), dom, agent_id, NOW())
  ON CONFLICT (email_address) DO UPDATE SET assigned_agent_id = EXCLUDED.assigned_agent_id, updated_at = NOW();
  INSERT INTO email_log (event_type, details)
  VALUES ('routing_rule_created', jsonb_build_object('ticket_id', NEW.id, 'client_email', NEW.client_email, 'email_domain', dom, 'assigned_agent_id', agent_id));
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_ticket_assignment_learn_routing ON tickets;
CREATE TRIGGER on_ticket_assignment_learn_routing
  AFTER UPDATE OF user_id, assigned_to_array ON tickets FOR EACH ROW EXECUTE FUNCTION learn_routing_rule();


-- ========== STEP 3: EMAIL_TO_TICKET_MAILBOXES (two mailboxes) ==========
INSERT INTO support_mailboxes (
  mailbox_address, imap_server, imap_port, smtp_server, smtp_port,
  username, password_encrypted, default_assigned_agent_id, is_active
)
VALUES (
  'support@thinkdigital.co.za',
  'imap.office365.com', 993, 'smtp.office365.com', 587,
  'support@thinkdigital.co.za',
  NULL,
  (SELECT id FROM profiles WHERE full_name ILIKE '%Cornett%' LIMIT 1),
  true
)
ON CONFLICT (mailbox_address) DO UPDATE SET
  default_assigned_agent_id = EXCLUDED.default_assigned_agent_id,
  imap_server = EXCLUDED.imap_server, imap_port = EXCLUDED.imap_port,
  smtp_server = EXCLUDED.smtp_server, smtp_port = EXCLUDED.smtp_port,
  username = EXCLUDED.username, is_active = EXCLUDED.is_active, updated_at = NOW();

INSERT INTO support_mailboxes (
  mailbox_address, imap_server, imap_port, smtp_server, smtp_port,
  username, password_encrypted, default_assigned_agent_id, is_active
)
VALUES (
  'support@gowaterfall.co.za',
  'imap.office365.com', 993, 'smtp.office365.com', 587,
  'support@gowaterfall.co.za',
  NULL,
  (SELECT id FROM profiles WHERE full_name ILIKE '%Coenie%' LIMIT 1),
  true
)
ON CONFLICT (mailbox_address) DO UPDATE SET
  default_assigned_agent_id = EXCLUDED.default_assigned_agent_id,
  imap_server = EXCLUDED.imap_server, imap_port = EXCLUDED.imap_port,
  smtp_server = EXCLUDED.smtp_server, smtp_port = EXCLUDED.smtp_port,
  username = EXCLUDED.username, is_active = EXCLUDED.is_active, updated_at = NOW();


-- ========== STEP 4: ADD PENDING STATUS (email-to-ticket) ==========
-- Valid statuses: pending, open, closed. Pending = unassigned (from email).
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check
  CHECK (status IN ('pending', 'open', 'closed'));


-- ========== AFTER RUNNING: set mailbox passwords ==========
-- UPDATE support_mailboxes SET password_encrypted = 'your-app-password' WHERE mailbox_address = 'support@thinkdigital.co.za';
-- UPDATE support_mailboxes SET password_encrypted = 'your-app-password' WHERE mailbox_address = 'support@gowaterfall.co.za';
