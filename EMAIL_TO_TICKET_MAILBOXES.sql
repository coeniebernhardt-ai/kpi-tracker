-- ============================================
-- EMAIL-TO-TICKET: INSERT THREE SUPPORT MAILBOXES
-- Run AFTER EMAIL_TO_TICKET_SCHEMA.sql
-- Resolves default_assigned_agent_id from profiles by name.
-- ============================================
-- ASSIGNMENT RULES:
--   support@balwin.com   → Cornett
--   support@redefine.com  → Marcellus
--   support@gowaterfall.com → Coenie
-- ============================================
-- After running, set each mailbox password in Supabase (Table Editor > support_mailboxes > password_encrypted)
-- or run: UPDATE support_mailboxes SET password_encrypted = 'your-app-password' WHERE mailbox_address = 'support@balwin.com';
-- Use app passwords (e.g. Office 365 app password), not personal passwords.
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
VALUES
  (
    'support@balwin.com',
    'imap.office365.com',
    993,
    'smtp.office365.com',
    587,
    'support@balwin.com',
    NULL,
    (SELECT id FROM profiles WHERE full_name ILIKE '%Cornett%' LIMIT 1),
    true
  ),
  (
    'support@redefine.com',
    'imap.office365.com',
    993,
    'smtp.office365.com',
    587,
    'support@redefine.com',
    NULL,
    (SELECT id FROM profiles WHERE full_name ILIKE '%Marcellus%' LIMIT 1),
    true
  ),
  (
    'support@gowaterfall.com',
    'imap.office365.com',
    993,
    'smtp.office365.com',
    587,
    'support@gowaterfall.com',
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

-- Verify: check that default_assigned_agent_id is set for each row (not NULL)
-- SELECT mailbox_address, default_assigned_agent_id, (SELECT full_name FROM profiles WHERE id = default_assigned_agent_id) AS agent_name FROM support_mailboxes;
