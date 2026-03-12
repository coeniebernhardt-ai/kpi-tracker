/**
 * POST /api/email/ingest
 * Webhook endpoint for real-time email ingestion.
 * Mail server forwards incoming email to this URL (raw body or provider-specific JSON).
 * Parses email, dedupes by message_id, then creates ticket or adds comment.
 */

import { NextRequest, NextResponse } from 'next/server';
import { simpleParser } from 'mailparser';
import {
  getSupabaseAdmin,
  getActiveMailboxes,
  processIncomingEmail,
  parseEmailBody,
  type SupportMailbox,
  type IncomingEmailPayload,
} from '@/app/lib/email-to-ticket';

export const maxDuration = 30;

const ALLOWED_MAILBOXES = ['support@thinkdigital.co.za', 'support@gowaterfall.co.za'];

function getMailboxFromRequest(request: NextRequest): string | null {
  const header = request.headers.get('x-mailbox') ?? request.headers.get('x-forwarded-to');
  if (header) {
    const addr = header.split(',')[0].trim().toLowerCase();
    if (ALLOWED_MAILBOXES.includes(addr)) return addr;
  }
  return null;
}

async function getMailboxByAddress(mailboxAddress: string): Promise<SupportMailbox | null> {
  const list = await getActiveMailboxes();
  return list.find((m) => m.mailbox_address.toLowerCase() === mailboxAddress.toLowerCase()) ?? null;
}

/** Parse raw email buffer into IncomingEmailPayload. */
async function parseRawEmail(raw: Buffer): Promise<IncomingEmailPayload & { mailbox_address?: string } | null> {
  try {
    const parsed = await simpleParser(raw);
    const messageId = (parsed.messageId || '').trim() || `webhook-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const from = parsed.from?.text || '';
    const senderEmail = parsed.from?.value?.[0]?.address || from.split('<').pop()?.replace('>', '').trim() || '';
    if (!senderEmail) return null;
    const subject = parsed.subject || '(No subject)';
    const body = parseEmailBody(parsed);
    const attachments = (parsed.attachments || []).map((a) => ({
      filename: a.filename || 'attachment',
      content: a.content,
      contentType: a.contentType,
    }));
    return {
      sender_email: senderEmail,
      subject,
      body,
      message_id: messageId,
      attachments,
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') ?? '';
    let mailboxAddress = getMailboxFromRequest(request);
    let payload: IncomingEmailPayload | null = null;

    if (contentType.includes('application/json')) {
      const json = await request.json();
      mailboxAddress = mailboxAddress ?? (json.mailbox_address ?? json.mailbox) ?? null;
      if (json.raw) {
        const raw = typeof json.raw === 'string' ? Buffer.from(json.raw, 'utf-8') : Buffer.from(json.raw);
        const parsed = await parseRawEmail(raw);
        if (parsed) payload = parsed;
      } else if (json.sender_email && json.subject != null && json.message_id) {
        payload = {
          sender_email: json.sender_email,
          subject: String(json.subject),
          body: String(json.body ?? ''),
          message_id: json.message_id,
          attachments: Array.isArray(json.attachments)
            ? json.attachments.map((a: { filename?: string; content: string | Buffer; contentType?: string }) => ({
                filename: a.filename ?? 'attachment',
                content: typeof a.content === 'string' ? Buffer.from(a.content, 'base64') : Buffer.from(a.content),
                contentType: a.contentType,
              }))
            : undefined,
        };
      }
    } else if (contentType.includes('text/plain') || contentType.includes('message/rfc822') || contentType.includes('multipart/')) {
      const raw = await request.arrayBuffer();
      const parsed = await parseRawEmail(Buffer.from(raw));
      if (parsed) payload = parsed;
    }

    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid body: provide raw email or JSON with sender_email, subject, body, message_id' },
        { status: 400 }
      );
    }

    if (!mailboxAddress || !ALLOWED_MAILBOXES.includes(mailboxAddress.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid mailbox: set X-Mailbox header or mailbox_address to support@thinkdigital.co.za or support@gowaterfall.co.za' },
        { status: 400 }
      );
    }

    const mailbox = await getMailboxByAddress(mailboxAddress);
    if (!mailbox) {
      return NextResponse.json(
        { success: false, error: `Mailbox ${mailboxAddress} not found or inactive in support_mailboxes` },
        { status: 400 }
      );
    }

    const result = await processIncomingEmail(mailbox, payload, getSupabaseAdmin());
    if (result.processed) {
      return NextResponse.json({ success: true, processed: true });
    }
    return NextResponse.json(
      { success: true, processed: false, reason: result.error ?? 'skipped' },
      { status: 200 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('email/ingest error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
