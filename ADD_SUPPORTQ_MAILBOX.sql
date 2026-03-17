-- Add SupportQ@thinkdigital.co.za to support mailboxes (IMAP + webhook ingest).
-- Run in Supabase SQL Editor. Then set the App Password:
--   UPDATE support_mailboxes SET password_encrypted = 'your-app-password' WHERE mailbox_address = 'supportq@thinkdigital.co.za';

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
  'supportq@thinkdigital.co.za',
  'imap.office365.com',
  993,
  'smtp.office365.com',
  587,
  'thinkq@thinkdigital.co.za',
  NULL,
  (SELECT id FROM profiles WHERE full_name ILIKE '%Cornett%' LIMIT 1),
  true
)
ON CONFLICT (mailbox_address) DO UPDATE SET
  imap_server = EXCLUDED.imap_server,
  imap_port = EXCLUDED.imap_port,
  smtp_server = EXCLUDED.smtp_server,
  smtp_port = EXCLUDED.smtp_port,
  username = EXCLUDED.username,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
