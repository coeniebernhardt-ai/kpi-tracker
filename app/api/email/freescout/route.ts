import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  getActiveMailboxes,
  getSupabaseAdmin,
  processIncomingEmail,
  type IncomingEmailPayload,
  type SupportMailbox,
} from '@/app/lib/email-to-ticket';

const DEFAULT_MAILBOX_ADDRESS = 'supportq@thinkdigital.co.za';
const SUPPORTED_EVENTS = new Set(['convo.created', 'convo.customer.reply.created']);

type FreeScoutAttachment = {
  content?: string;
  contentType?: string;
  data?: string;
  fileName?: string;
  filename?: string;
  mimeType?: string;
};

type FreeScoutPerson = {
  email?: string;
};

type FreeScoutThread = {
  body?: string;
  createdAt?: string;
  createdBy?: FreeScoutPerson;
  customer?: FreeScoutPerson;
  id?: number | string;
  source?: {
    via?: string;
  };
  type?: string;
  _embedded?: {
    attachments?: FreeScoutAttachment[];
  };
};

type FreeScoutConversation = {
  createdBy?: FreeScoutPerson;
  customer?: FreeScoutPerson;
  customFields?: Array<{
    name?: string;
    text?: string;
    value?: string | number | boolean | null;
  }>;
  id?: number | string;
  number?: number | string;
  preview?: string;
  subject?: string;
  _embedded?: {
    threads?: FreeScoutThread[];
  };
};

function getWebhookSecret(): string {
  return (process.env.FREESCOUT_WEBHOOK_SECRET ?? '').trim();
}

function getConfiguredMailboxAddress(conversation: FreeScoutConversation, request: NextRequest): string {
  const headerMailbox = request.headers.get('x-mailbox')?.trim().toLowerCase();
  if (headerMailbox) return headerMailbox;

  const customFieldMailbox = conversation.customFields
    ?.find((field) => ['mailbox', 'mailbox_address', 'support_mailbox', 'support_mailbox_address'].includes((field.name ?? '').trim().toLowerCase()))
    ?.value;

  if (typeof customFieldMailbox === 'string' && customFieldMailbox.trim()) {
    return customFieldMailbox.trim().toLowerCase();
  }

  return (process.env.FREESCOUT_MAILBOX_ADDRESS ?? DEFAULT_MAILBOX_ADDRESS).trim().toLowerCase();
}

function isValidSignature(rawBody: string, headerSignature: string | null, secret: string): boolean {
  if (!headerSignature) return false;
  const expected = createHmac('sha1', secret).update(rawBody).digest('base64');
  const expectedBuffer = Buffer.from(expected.trim(), 'utf8');
  const actualBuffer = Buffer.from(headerSignature.trim(), 'utf8');
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

async function getMailboxByAddress(mailboxAddress: string): Promise<SupportMailbox | null> {
  const list = await getActiveMailboxes(getSupabaseAdmin());
  return list.find((mailbox) => mailbox.mailbox_address.toLowerCase() === mailboxAddress.toLowerCase()) ?? null;
}

function toComparableTime(value: string | undefined): number {
  if (!value) return 0;
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
}

function pickCustomerThread(conversation: FreeScoutConversation, event: string): FreeScoutThread | null {
  const threads = conversation._embedded?.threads ?? [];
  const customerThreads = threads.filter((thread) => {
    const type = (thread.type ?? '').toLowerCase();
    const via = (thread.source?.via ?? '').toLowerCase();
    return type === 'customer' || via === 'customer';
  });

  if (customerThreads.length === 0) return null;

  const sorted = [...customerThreads].sort((left, right) => toComparableTime(left.createdAt) - toComparableTime(right.createdAt));
  return event === 'convo.customer.reply.created' ? sorted[sorted.length - 1] : sorted[0];
}

function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, num: string) => String.fromCharCode(Number(num)))
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function getSenderEmail(conversation: FreeScoutConversation, thread: FreeScoutThread | null): string {
  return (
    thread?.customer?.email ??
    thread?.createdBy?.email ??
    conversation.customer?.email ??
    conversation.createdBy?.email ??
    ''
  ).trim();
}

async function extractAttachments(thread: FreeScoutThread | null): Promise<IncomingEmailPayload['attachments']> {
  const attachments = thread?._embedded?.attachments ?? [];
  const normalized = attachments.flatMap((attachment) => {
    const base64 = attachment.data ?? attachment.content;
    if (!base64) return [];

    try {
      return [{
        filename: attachment.fileName ?? attachment.filename ?? 'attachment',
        content: Buffer.from(base64, 'base64'),
        contentType: attachment.mimeType ?? attachment.contentType,
      }];
    } catch {
      return [];
    }
  });

  return normalized.length ? normalized : undefined;
}

async function normalizeFreeScoutPayload(
  request: NextRequest,
  conversation: FreeScoutConversation,
  event: string
): Promise<{ mailbox: SupportMailbox; payload: IncomingEmailPayload } | { error: string; status: number }> {
  const mailboxAddress = getConfiguredMailboxAddress(conversation, request);
  const mailbox = await getMailboxByAddress(mailboxAddress);
  if (!mailbox) {
    return {
      error: `Mailbox ${mailboxAddress} not found or inactive in support_mailboxes.`,
      status: 400,
    };
  }

  const thread = pickCustomerThread(conversation, event);
  const senderEmail = getSenderEmail(conversation, thread);
  if (!senderEmail) {
    return {
      error: 'Unable to resolve sender email from FreeScout payload.',
      status: 400,
    };
  }

  const body = stripHtml(thread?.body ?? conversation.preview ?? '');
  const attachments = await extractAttachments(thread);
  const conversationId = conversation.id ?? conversation.number ?? 'unknown';
  const threadId = thread?.id ?? 'root';
  const messageId = `freescout-${event}-${conversationId}-${threadId}`;

  return {
    mailbox,
    payload: {
      sender_email: senderEmail,
      subject: conversation.subject?.trim() || '(No subject)',
      body: body || '(No content)',
      message_id: messageId,
      attachments,
    },
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'FreeScout email bridge ready',
    configuredMailbox: (process.env.FREESCOUT_MAILBOX_ADDRESS ?? DEFAULT_MAILBOX_ADDRESS).trim().toLowerCase(),
    webhookSecretConfigured: Boolean(getWebhookSecret()),
  });
}

export async function POST(request: NextRequest) {
  const secret = getWebhookSecret();
  if (!secret) {
    return NextResponse.json(
      { success: false, error: 'Missing FREESCOUT_WEBHOOK_SECRET' },
      { status: 500 }
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get('x-freescout-signature');
  if (!isValidSignature(rawBody, signature, secret)) {
    return NextResponse.json({ success: false, error: 'Invalid FreeScout signature' }, { status: 401 });
  }

  const event = (request.headers.get('x-freescout-event') ?? '').trim();
  if (!SUPPORTED_EVENTS.has(event)) {
    return NextResponse.json({
      success: true,
      processed: false,
      reason: `ignored_event:${event || 'missing'}`,
    });
  }

  try {
    const conversation = JSON.parse(rawBody) as FreeScoutConversation;
    const normalized = await normalizeFreeScoutPayload(request, conversation, event);
    if ('error' in normalized) {
      return NextResponse.json({ success: false, error: normalized.error }, { status: normalized.status });
    }

    const result = await processIncomingEmail(normalized.mailbox, normalized.payload, getSupabaseAdmin());
    return NextResponse.json({
      success: true,
      processed: result.processed,
      reason: result.processed ? undefined : result.error ?? 'skipped',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('email/freescout error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
