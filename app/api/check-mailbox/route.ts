/**
 * POST /api/check-mailbox
 * Mailbox polling: connect via IMAP, read unread messages, create/update tickets.
 * Called by Vercel Cron every 5 minutes (production only). Use GET to verify setup.
 */

import { NextRequest, NextResponse } from 'next/server';
import { processAllMailboxes, getActiveMailboxes } from '@/app/lib/email-to-ticket';

export const maxDuration = 60;

/** GET: verify route and mailbox config (no credentials exposed). */
export async function GET() {
  try {
    const mailboxes = await getActiveMailboxes();
    const withPassword = mailboxes.filter((m) => !!m.password_encrypted).length;
    return NextResponse.json({
      ok: true,
      message: 'Check-mailbox endpoint active',
      mailboxesConfigured: mailboxes.length,
      mailboxesWithPassword: withPassword,
      hint: mailboxes.length === 0
        ? 'Add rows to support_mailboxes (is_active = true) in Supabase.'
        : withPassword < mailboxes.length
          ? 'Set password_encrypted for each mailbox (Office 365 App Password).'
          : 'POST with Authorization: Bearer CRON_SECRET to process now. Cron runs every 5 min on production.',
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    if (secret && authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const result = await processAllMailboxes();
    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors.length ? result.errors : undefined,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('check-mailbox error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
