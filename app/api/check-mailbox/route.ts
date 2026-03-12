/**
 * POST /api/check-mailbox
 * Fallback mailbox polling: connect via IMAP, read unread messages, process with same logic as webhook.
 * Called by Vercel Cron every 10 minutes when webhook forwarding is unavailable.
 */

import { NextRequest, NextResponse } from 'next/server';
import { processAllMailboxes } from '@/app/lib/email-to-ticket';

export const maxDuration = 60;

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
