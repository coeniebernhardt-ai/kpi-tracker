/**
 * GET/POST /api/check-mailbox
 * Mailbox polling: connect via IMAP, read unread messages, create/update tickets.
 * Vercel Cron calls GET (not POST), so we process mail on GET when from cron or when authorized.
 */

import { NextRequest, NextResponse } from 'next/server';
import { processAllMailboxes, getActiveMailboxes, isWebhookOnlyMailbox } from '@/app/lib/email-to-ticket';

export const maxDuration = 60;

function isCronOrAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (secret && authHeader === `Bearer ${secret}`) return true;
  const ua = request.headers.get('user-agent') ?? '';
  if (/vercel-cron/i.test(ua)) return true;
  return false;
}

/** GET: if from Vercel Cron or Authorization: Bearer CRON_SECRET, process mailboxes; else return health info. */
export async function GET(request: NextRequest) {
  try {
    if (isCronOrAuthorized(request)) {
      const result = await processAllMailboxes();
      return NextResponse.json({
        success: true,
        processed: result.processed,
        errors: result.errors.length ? result.errors : undefined,
      });
    }
    const mailboxes = await getActiveMailboxes();
    const polledMailboxes = mailboxes.filter((mailbox) => !isWebhookOnlyMailbox(mailbox.mailbox_address));
    const webhookOnlyMailboxes = mailboxes.length - polledMailboxes.length;
    const withPassword = polledMailboxes.filter((m) => !!m.password_encrypted).length;
    return NextResponse.json({
      ok: true,
      message: 'Check-mailbox endpoint active',
      mailboxesConfigured: mailboxes.length,
      mailboxesPolled: polledMailboxes.length,
      webhookOnlyMailboxes,
      mailboxesWithPassword: withPassword,
      hint: polledMailboxes.length === 0
        ? webhookOnlyMailboxes > 0
          ? 'All active mailboxes are webhook-only; IMAP polling is intentionally skipped.'
          : 'Add rows to support_mailboxes (is_active = true) in Supabase.'
        : withPassword < polledMailboxes.length
          ? 'Set password_encrypted for each polled mailbox (Office 365 App Password), or move that mailbox to EMAIL_WEBHOOK_ONLY_MAILBOXES.'
          : 'Cron runs every 1 min (GET). Use Authorization: Bearer CRON_SECRET to process now.',
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('check-mailbox error:', message);
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
