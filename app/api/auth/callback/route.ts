import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function getSupabaseAdmin() {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!u || !k) throw new Error('Missing SUPABASE env vars');
  return createClient(u, k);
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    if (error) {
      return new NextResponse(
        `<html><body><h2>Microsoft login failed</h2><pre>${(errorDescription ?? error).toString()}</pre></body></html>`,
        { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    const cookieState = request.cookies.get('msoauth_state')?.value ?? null;
    if (!state || !cookieState || state !== cookieState) {
      return new NextResponse(
        `<html><body><h2>Invalid state</h2><p>Please restart the login flow.</p></body></html>`,
        { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }
    if (!code) {
      return new NextResponse(
        `<html><body><h2>Missing code</h2><p>Please restart the login flow.</p></body></html>`,
        { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    const tenant = requiredEnv('AZURE_TENANT_ID');
    const clientId = requiredEnv('AZURE_CLIENT_ID');
    const clientSecret = requiredEnv('AZURE_CLIENT_SECRET');
    const redirectUri = requiredEnv('OAUTH_REDIRECT_URI');
    const mailboxUser = requiredEnv('IMAP_USER').toLowerCase().trim();

    const tokenUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
    const body = new URLSearchParams();
    body.set('client_id', clientId);
    body.set('client_secret', clientSecret);
    body.set('grant_type', 'authorization_code');
    body.set('code', code);
    body.set('redirect_uri', redirectUri);
    body.set('scope', 'https://outlook.office.com/IMAP.AccessAsUser.All offline_access');

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const tokenJson = (await tokenRes.json().catch(() => null)) as any;
    if (!tokenRes.ok || !tokenJson?.access_token || !tokenJson?.refresh_token || !tokenJson?.expires_in) {
      return new NextResponse(
        `<html><body><h2>Token exchange failed</h2><pre>${JSON.stringify(tokenJson, null, 2)}</pre></body></html>`,
        { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    const expiresAt = new Date(Date.now() + Number(tokenJson.expires_in) * 1000).toISOString();
    const admin = getSupabaseAdmin();
    const { error: upsertErr } = await admin.from('oauth_tokens').upsert(
      {
        provider: 'microsoft',
        mailbox_user: mailboxUser,
        access_token: String(tokenJson.access_token),
        refresh_token: String(tokenJson.refresh_token),
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'provider,mailbox_user' }
    );
    if (upsertErr) {
      return new NextResponse(
        `<html><body><h2>Token save failed</h2><pre>${upsertErr.message}</pre></body></html>`,
        { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    const res = new NextResponse(
      `<html><body><h2>Mailbox connected successfully</h2><p>You can close this tab.</p></body></html>`,
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
    res.cookies.set('msoauth_state', '', { path: '/api/auth', maxAge: 0 });
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return new NextResponse(
      `<html><body><h2>Auth error</h2><pre>${message}</pre></body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

