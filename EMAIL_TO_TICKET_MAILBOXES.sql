-- ============================================
-- EMAIL-TO-TICKET: TWO SUPPORT MAILBOXES (ThinkQ/FinQ)
-- Run AFTER EMAIL_TO_TICKET_SCHEMA.sql and EMAIL_TO_TICKET_ROUTING_SCHEMA.sql
-- support@thinkdigital.co.za, support@gowaterfall.co.za
-- default_assigned_agent_id used only when routing has a match (otherwise ticket is pending).
-- ============================================
-- Outbound replies are sent FROM the ticket's mailbox (ticket_mailbox).
-- After running, set password_encrypted for each:
--   UPDATE support_mailboxes SET password_encrypted = '...' WHERE mailbox_address = 'support@thinkdigital.co.za';
--   UPDATE support_mailboxes SET password_encrypted = '...' WHERE mailbox_address = 'support@gowaterfall.co.za';
-- ============================================

INSERT INTO support_mailboxes (
  mailbox_address,
  imap_server,
  imap_port,
  smtp_server,
  smtp_port,
  username,
  password_encrypted,
  default_assigned_agent_id,
  is_active
)
VALUES (
  'support@thinkdigital.co.za',
  'imap.office365.com',
  993,
  'smtp.office365.com',
  587,
  'support@thinkdigital.co.za',
  NULL,
  (SELECT id FROM profiles WHERE full_name ILIKE '%Cornett%' LIMIT 1),
  true
)
ON CONFLICT (mailbox_address) DO UPDATE SET
  default_assigned_agent_id = EXCLUDED.default_assigned_agent_id,
  imap_server = EXCLUDED.imap_server,
  imap_port = EXCLUDED.imap_port,
  smtp_server = EXCLUDED.smtp_server,
  smtp_port = EXCLUDED.smtp_port,
  username = EXCLUDED.username,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO support_mailboxes (
  mailbox_address,
  imap_server,
  imap_port,
  smtp_server,
  smtp_port,
  username,
  password_encrypted,
  default_assigned_agent_id,
  is_active
)
VALUES (
  'support@gowaterfall.co.za',
  'imap.office365.com',
  993,
  'smtp.office365.com',
  587,
  'support@gowaterfall.co.za',
  NULL,
  (SELECT id FROM profiles WHERE full_name ILIKE '%Coenie%' LIMIT 1),
  true
)
ON CONFLICT (mailbox_address) DO UPDATE SET
  default_assigned_agent_id = EXCLUDED.default_assigned_agent_id,
  imap_server = EXCLUDED.imap_server,
  imap_port = EXCLUDED.imap_port,
  smtp_server = EXCLUDED.smtp_server,
  smtp_port = EXCLUDED.smtp_port,
  username = EXCLUDED.username,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
