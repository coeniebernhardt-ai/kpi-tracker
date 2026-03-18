-- ============================================
-- OAuth token storage for Microsoft IMAP (delegated)
-- Run in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS oauth_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL DEFAULT 'microsoft',
  mailbox_user TEXT NOT NULL, -- e.g. thinkq@thinkdigital.co.za
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS oauth_tokens_provider_mailbox_user_key
  ON oauth_tokens(provider, mailbox_user);

ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Service role full access (server-side only)
DROP POLICY IF EXISTS "Service role full access oauth_tokens" ON oauth_tokens;
CREATE POLICY "Service role full access oauth_tokens" ON oauth_tokens
  FOR ALL USING (true) WITH CHECK (true);

