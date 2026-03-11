/**
 * POST /api/cron/process-email
 * Mail listener: poll all active mailboxes, create/update tickets from unread emails.
 * Secure with CRON_SECRET (e.g. Vercel Cron or external cron sends Authorization: Bearer <CRON_SECRET>).
 */

import { NextRequest, NextResponse } from 'next/server';
import { processAllMailboxes } from '../../../lib/email-to-ticket';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const secret = process.env.CRON_SECRET;
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
    console.error('process-email cron error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
