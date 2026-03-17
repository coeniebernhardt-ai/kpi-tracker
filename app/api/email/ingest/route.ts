/**
 * POST /api/email/ingest
 * Accepts provider JSON or raw email, parses, then creates ticket or adds comment via email-to-ticket logic.
 * Schema: see EMAIL_INGEST_SCHEMA.md
 */

import { NextResponse } from 'next/server';
import { simpleParser } from 'mailparser';
import {
  getSupabaseAdmin,
  getActiveMailboxes,
  processIncomingEmail,
  parseEmailBody,
  type SupportMailbox,
  type IncomingEmailPayload,
} from '@/app/lib/email-to-ticket';

const ALLOWED_MAILBOXES = ['support@thinkdigital.co.za', 'support@gowaterfall.co.za', 'supportq@thinkdigital.co.za'];

/** Provider JSON body (flexible field names). */
type ProviderPayload = {
  sender_email?: string;
  from?: string;
  subject?: string;
  body?: string;
  text?: string;
  html?: string;
  message_id?: string;
  mailbox_address?: string;
  attachments?: { filename?: string; content: string; content_type?: string }[];
};

function getMailboxFromHeader(req: Request): string | null {
  const header = req.headers.get('x-mailbox') ?? req.headers.get('x-forwarded-to');
  if (!header) return null;
  const addr = header.split(',')[0].trim().toLowerCase();
  return ALLOWED_MAILBOXES.includes(addr) ? addr : null;
}

async function getMailboxByAddress(mailboxAddress: string): Promise<SupportMailbox | null> {
  const list = await getActiveMailboxes(getSupabaseAdmin());
  return list.find((m) => m.mailbox_address.toLowerCase() === mailboxAddress.toLowerCase()) ?? null;
}

function normalizeProviderPayload(raw: ProviderPayload): { payload: IncomingEmailPayload; mailbox_address: string } | null {
  const sender = raw.sender_email ?? raw.from;
  const body = raw.body ?? raw.text ?? (raw.html ? raw.html.replace(/<[^>]+>/g, ' ').trim() : '');
  const mailbox = (raw.mailbox_address ?? '').trim().toLowerCase();
  if (!sender || typeof raw.subject !== 'string' || !mailbox || !ALLOWED_MAILBOXES.includes(mailbox)) {
    return null;
  }
  const messageId = (raw.message_id ?? `webhook-${Date.now()}-${Math.random().toString(36).slice(2)}`).trim();
  const attachments = (raw.attachments ?? []).map((a) => ({
    filename: a.filename ?? 'attachment',
    content: Buffer.from(a.content, 'base64'),
    contentType: a.content_type,
  }));
  return {
    payload: {
      sender_email: String(sender).trim(),
      subject: String(raw.subject),
      body: body || '(No content)',
      message_id: messageId,
      attachments: attachments.length ? attachments : undefined,
    },
    mailbox_address: mailbox,
  };
}

/** Parse raw email buffer into IncomingEmailPayload + mailbox (must come from X-Mailbox). */
async function parseRawEmail(
  raw: Buffer,
  mailboxAddress: string | null
): Promise<{ payload: IncomingEmailPayload; mailbox_address: string } | null> {
  if (!mailboxAddress || !ALLOWED_MAILBOXES.includes(mailboxAddress)) return null;
  try {
    const parsed = await simpleParser(raw);
    const messageId = (parsed.messageId ?? '').trim() || `raw-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const from = parsed.from?.text ?? '';
    const senderEmail = parsed.from?.value?.[0]?.address ?? from.split('<').pop()?.replace('>', '').trim() ?? '';
    if (!senderEmail) return null;
    const subject = parsed.subject ?? '(No subject)';
    const body = parseEmailBody(parsed);
    const attachments = (parsed.attachments ?? []).map((a) => ({
      filename: a.filename ?? 'attachment',
      content: a.content,
      contentType: a.contentType,
    }));
    return {
      payload: {
        sender_email: senderEmail,
        subject,
        body,
        message_id: messageId,
        attachments: attachments.length ? attachments : undefined,
      },
      mailbox_address: mailboxAddress,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  return new Response(
    JSON.stringify({
      status: "ok",
      message: "Email ingest endpoint running"
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }
  );
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') ?? '';
    let parsed: { payload: IncomingEmailPayload; mailbox_address: string } | null = null;

    if (contentType.includes('application/json')) {
      const json = (await req.json()) as ProviderPayload;
      const mailboxFromHeader = getMailboxFromHeader(req);
      const mailboxAddress = (json.mailbox_address ?? '').trim().toLowerCase() || mailboxFromHeader;
      const normalized = normalizeProviderPayload({ ...json, mailbox_address: mailboxAddress || undefined });
      if (normalized) parsed = normalized;
    } else {
      const mailboxAddress = getMailboxFromHeader(req);
      const raw = await req.arrayBuffer();
      parsed = await parseRawEmail(Buffer.from(raw), mailboxAddress);
    }

    if (!parsed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid payload: need sender_email/from, subject, body/text, message_id, and mailbox_address (or X-Mailbox). mailbox_address must be one of the configured support mailboxes.',
        },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const mailbox = await getMailboxByAddress(parsed.mailbox_address);
    if (!mailbox) {
      return NextResponse.json(
        {
          success: false,
          error: `Mailbox ${parsed.mailbox_address} not found or inactive in support_mailboxes.`,
        },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await processIncomingEmail(mailbox, parsed.payload, getSupabaseAdmin());
    if (result.processed) {
      return NextResponse.json(
        { success: true, processed: true },
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return NextResponse.json(
      { success: true, processed: false, reason: result.error ?? 'skipped' },
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('email/ingest error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
