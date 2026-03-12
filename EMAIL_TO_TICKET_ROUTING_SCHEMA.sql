-- ============================================
-- EMAIL-TO-TICKET: INTELLIGENT ROUTING + SINGLE MAILBOX (ThinkQ/FinQ)
-- Run after EMAIL_TO_TICKET_SCHEMA.sql
-- Single mailbox: support@thinkdigital.co.za
-- Routing: sender_estate (Balwin/Redefine) → agent; routing_rules (learned); default Cornett
-- ============================================

-- Numeric display ID for tickets (used in subject [Ticket #1234])
CREATE SEQUENCE IF NOT EXISTS ticket_display_id_seq;

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS display_id INTEGER UNIQUE;
COMMENT ON COLUMN tickets.display_id IS 'Numeric id for email subject [Ticket #display_id]; set on insert via nextval(ticket_display_id_seq)';

-- Auto-set display_id on insert when null
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

-- Backfill display_id for existing tickets (optional, run once)
-- UPDATE tickets SET display_id = nextval('ticket_display_id_seq') WHERE display_id IS NULL;

-- Step 1: Known sender → estate (Balwin, Redefine). Populate from your system user/client data.
CREATE TABLE IF NOT EXISTS sender_estate (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_address TEXT NOT NULL UNIQUE,
  estate_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sender_estate_email ON sender_estate(email_address);

-- Step 2 & learning: Routing rules (exact email or domain → agent). Learned when technician assigns/reassigns.
CREATE TABLE IF NOT EXISTS routing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_address TEXT,
  email_domain TEXT,
  assigned_agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT routing_rule_email_or_domain CHECK (email_address IS NOT NULL OR email_domain IS NOT NULL)
);

-- One rule per email (upsert when learning); domain can repeat for different agents
ALTER TABLE routing_rules DROP CONSTRAINT IF EXISTS routing_rules_email_address_key;
ALTER TABLE routing_rules ADD CONSTRAINT routing_rules_email_address_key UNIQUE (email_address);
CREATE INDEX IF NOT EXISTS idx_routing_rules_domain ON routing_rules(email_domain) WHERE email_domain IS NOT NULL;

-- RLS
ALTER TABLE sender_estate ENABLE ROW LEVEL SECURITY;
ALTER TABLE routing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access sender_estate"
  ON sender_estate FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access routing_rules"
  ON routing_rules FOR ALL USING (true) WITH CHECK (true);

-- Trigger: when ticket assignment changes and ticket has client_email, learn a routing rule
CREATE OR REPLACE FUNCTION learn_routing_rule()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  agent_id UUID;
  dom TEXT;
BEGIN
  IF NEW.client_email IS NULL OR TRIM(NEW.client_email) = '' THEN
    RETURN NEW;
  END IF;

  IF (OLD.assigned_to_array IS NOT DISTINCT FROM NEW.assigned_to_array)
     AND (OLD.user_id IS NOT DISTINCT FROM NEW.user_id) THEN
    RETURN NEW;
  END IF;

  agent_id := NEW.user_id;
  IF agent_id IS NULL AND array_length(NEW.assigned_to_array, 1) > 0 THEN
    agent_id := NEW.assigned_to_array[1];
  END IF;
  IF agent_id IS NULL THEN
    RETURN NEW;
  END IF;

  dom := LOWER(TRIM(SPLIT_PART(NEW.client_email, '@', 2)));
  IF dom = '' THEN
    dom := NULL;
  END IF;

  INSERT INTO routing_rules (email_address, email_domain, assigned_agent_id, updated_at)
  VALUES (LOWER(TRIM(NEW.client_email)), dom, agent_id, NOW())
  ON CONFLICT (email_address) DO UPDATE SET assigned_agent_id = EXCLUDED.assigned_agent_id, updated_at = NOW();

  INSERT INTO email_log (event_type, details)
  VALUES ('routing_rule_created', jsonb_build_object(
    'ticket_id', NEW.id, 'client_email', NEW.client_email, 'email_domain', dom, 'assigned_agent_id', agent_id
  ));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_ticket_assignment_learn_routing ON tickets;
CREATE TRIGGER on_ticket_assignment_learn_routing
  AFTER UPDATE OF user_id, assigned_to_array ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION learn_routing_rule();
