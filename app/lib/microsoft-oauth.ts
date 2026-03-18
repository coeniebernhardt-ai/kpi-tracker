import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function getSupabaseAdmin(): SupabaseClient {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!u || !k) throw new Error('Missing SUPABASE env vars');
  return createClient(u, k);
}

type TokenRow = {
  access_token: string;
  refresh_token: string;
  expires_at: string;
};

function isExpired(expiresAtIso: string, skewSeconds = 120): boolean {
  const t = Date.parse(expiresAtIso);
  if (!Number.isFinite(t)) return true;
  return t - Date.now() < skewSeconds * 1000;
}

export async function getMicrosoftImapAccessToken(
  supabase?: SupabaseClient
): Promise<{ accessToken: string; expiresAt: string }> {
  const db = supabase ?? getSupabaseAdmin();
  const mailboxUser = requiredEnv('IMAP_USER').toLowerCase().trim();

  const { data, error } = await db
    .from('oauth_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('provider', 'microsoft')
    .eq('mailbox_user', mailboxUser)
    .maybeSingle();
  if (error || !data) throw new Error('No OAuth tokens stored yet. Visit /api/auth/login first.');

  const row = data as TokenRow;
  if (!isExpired(row.expires_at)) {
    return { accessToken: row.access_token, expiresAt: row.expires_at };
  }

  const tenant = requiredEnv('AZURE_TENANT_ID');
  const clientId = requiredEnv('AZURE_CLIENT_ID');
  const clientSecret = requiredEnv('AZURE_CLIENT_SECRET');
  const tokenUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;

  const body = new URLSearchParams();
  body.set('client_id', clientId);
  body.set('client_secret', clientSecret);
  body.set('grant_type', 'refresh_token');
  body.set('refresh_token', row.refresh_token);
  body.set('scope', 'https://outlook.office.com/IMAP.AccessAsUser.All offline_access');

  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const tokenJson = (await tokenRes.json().catch(() => null)) as any;
  if (!tokenRes.ok || !tokenJson?.access_token || !tokenJson?.expires_in) {
    throw new Error(`Token refresh failed: ${JSON.stringify(tokenJson)}`);
  }

  const newExpiresAt = new Date(Date.now() + Number(tokenJson.expires_in) * 1000).toISOString();
  const newRefresh = tokenJson.refresh_token ? String(tokenJson.refresh_token) : row.refresh_token;

  const { error: upErr } = await db.from('oauth_tokens').upsert(
    {
      provider: 'microsoft',
      mailbox_user: mailboxUser,
      access_token: String(tokenJson.access_token),
      refresh_token: newRefresh,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'provider,mailbox_user' }
  );
  if (upErr) throw new Error(`Token save failed: ${upErr.message}`);

  return { accessToken: String(tokenJson.access_token), expiresAt: newExpiresAt };
}

