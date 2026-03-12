-- ============================================
-- EMAIL-TO-TICKET: SINGLE SUPPORT MAILBOX (ThinkQ/FinQ)
-- Run AFTER EMAIL_TO_TICKET_SCHEMA.sql and EMAIL_TO_TICKET_ROUTING_SCHEMA.sql
-- All support email: support@thinkdigital.co.za
-- Default agent when routing has no match: Cornett
-- ============================================
-- Outbound replies are always sent FROM support@thinkdigital.co.za.
-- After running, set password_encrypted in Table Editor or:
--   UPDATE support_mailboxes SET password_encrypted = 'your-app-password' WHERE mailbox_address = 'support@thinkdigital.co.za';
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
