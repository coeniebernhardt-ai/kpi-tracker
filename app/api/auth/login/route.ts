import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function GET(request: NextRequest) {
  const tenant = requiredEnv('AZURE_TENANT_ID');
  const clientId = requiredEnv('AZURE_CLIENT_ID');
  const redirectUri = requiredEnv('OAUTH_REDIRECT_URI');
  const mailboxUser = request.nextUrl.searchParams.get('mailbox_user')?.toLowerCase().trim() || process.env.IMAP_USER?.toLowerCase().trim();
  if (!mailboxUser) {
    throw new Error('Missing mailbox_user query parameter or IMAP_USER env var');
  }

  const state = crypto.randomBytes(24).toString('hex');

  const authorizeUrl = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`);
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('response_mode', 'query');
  authorizeUrl.searchParams.set('scope', 'https://outlook.office.com/IMAP.AccessAsUser.All offline_access');
  authorizeUrl.searchParams.set('state', state);

  const res = NextResponse.redirect(authorizeUrl.toString(), { status: 302 });
  res.cookies.set('msoauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 10 * 60, // 10 minutes
  });
  res.cookies.set('msoauth_mailbox_user', mailboxUser, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 10 * 60,
  });
  return res;
}

