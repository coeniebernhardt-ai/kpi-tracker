/**
 * Email-to-Ticket integration (ThinkQ).
 * Server-side only: IMAP fetch, ticket create/update, logging, duplicate/loop protection.
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ImapFlow } from 'imapflow';
import { simpleParser, type ParsedMail } from 'mailparser';
import nodemailer from 'nodemailer';

const TICKET_REF_REGEX = /\[Ticket\s*#([^\]]+)\]/i;
const LOOP_SENDER_PATTERNS = [/no-reply/i, /mailer-daemon/i, /donotreply/i, /auto-reply/i, /autoreply/i, /noreply/i];

export type SupportMailbox = {
  id: string;
  mailbox_address: string;
  imap_server: string;
  imap_port: number;
  smtp_server: string;
  smtp_port: number;
  username: string;
  password_encrypted: string | null;
  default_assigned_agent_id: string | null;
  is_active: boolean;
};

export type EmailLogEvent =
  | 'email_received'
  | 'ticket_created'
  | 'ticket_updated_from_email'
  | 'email_sent'
  | 'email_parse_error';

function getSupabaseAdmin(): SupabaseClient {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!u || !k) throw new Error('Missing SUPABASE env vars');
  return createClient(u, k);
}

export async function getActiveMailboxes(supabase?: SupabaseClient): Promise<SupportMailbox[]> {
  const db = supabase ?? getSupabaseAdmin();
  const { data, error } = await db
    .from('support_mailboxes')
    .select('*')
    .eq('is_active', true);
  if (error) throw error;
  return (data ?? []) as SupportMailbox[];
}

export async function isEmailProcessed(messageId: string, supabase?: SupabaseClient): Promise<boolean> {
  const db = supabase ?? getSupabaseAdmin();
  const { data } = await db.from('processed_emails').select('id').eq('message_id', messageId).maybeSingle();
  return !!data;
}

export async function markEmailProcessed(messageId: string, supabase?: SupabaseClient): Promise<void> {
  const db = supabase ?? getSupabaseAdmin();
  await db.from('processed_emails').insert({ message_id: messageId });
}

export async function logEmailEvent(
  eventType: EmailLogEvent,
  details: { mailbox_address?: string; ticket_id?: string; message_id?: string; [k: string]: unknown },
  supabase?: SupabaseClient
): Promise<void> {
  const db = supabase ?? getSupabaseAdmin();
  await db.from('email_log').insert({
    event_type: eventType,
    mailbox_address: details.mailbox_address ?? null,
    ticket_id: details.ticket_id ?? null,
    message_id: details.message_id ?? null,
    details: details as Record<string, unknown>,
  });
}

/** Strip signatures, quoted reply blocks, and normalize whitespace. */
export function parseEmailBody(parsed: ParsedMail): string {
  let text = '';
  if (parsed.text) text = parsed.text;
  else if (parsed.html) {
    text = parsed.html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
      .trim();
  }
  // Remove common quoted reply patterns (On ... wrote:, -----Original Message-----, etc.)
  text = text
    .replace(/\n-{3,}\s*Original Message\s*-{3,}[\s\S]*/i, '')
    .replace(/\nOn\s+.+wrote:\s*\n[\s\S]*/i, '')
    .replace(/\n>{1,}\s?.*/g, '')
    .replace(/\nFrom:[\s\S]*/i, '');
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  return text;
}

function shouldIgnoreSender(from: string): boolean {
  const lower = from.toLowerCase();
  return LOOP_SENDER_PATTERNS.some((re) => re.test(lower));
}

/** Extract ticket number from subject e.g. [Ticket #1234] or [Ticket #4832] Camera offline */
function extractTicketNumberFromSubject(subject: string): string | null {
  const m = subject.match(TICKET_REF_REGEX);
  return m ? m[1] : null;
}

/** Generate ticket_number for email-created tickets: use EM-YYYYMMDD-XXX when default agent has no initials. */
async function generateEmailTicketNumber(
  defaultAgentId: string,
  supabase: SupabaseClient
): Promise<string> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', defaultAgentId)
    .single();
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'EM'
    : 'EM';
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const { count } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', defaultAgentId)
    .gte('created_at', today.toISOString().slice(0, 10));
  const seq = String((count ?? 0) + 1).padStart(3, '0');
  return `${initials}-${dateStr}-${seq}`;
}

/** Create a new ticket from an incoming email. */
export async function createTicketFromEmail(
  mailbox: SupportMailbox,
  subject: string,
  body: string,
  senderEmail: string,
  attachments: { filename: string; content: Buffer; contentType?: string }[],
  messageId: string,
  supabase?: SupabaseClient
): Promise<{ ticketId: string; ticketNumber: string } | null> {
  const db = supabase ?? getSupabaseAdmin();
  const agentId = mailbox.default_assigned_agent_id;
  if (!agentId) {
    await logEmailEvent('email_parse_error', { mailbox_address: mailbox.mailbox_address, reason: 'no_default_agent', message_id: messageId }, db);
    return null;
  }
  const ticketNumber = await generateEmailTicketNumber(agentId, db);
  const now = new Date();
  const initialTimeLog = {
    minutes: 0,
    description: 'Ticket opened',
    timestamp: now.toISOString(),
    logged_by: 'System',
  };
  const attachmentUrls: { url: string; name: string; type: string }[] = [];
  // Store attachments in Supabase storage and get public URLs (or use a dedicated bucket path)
  const bucket = 'tickets';
  for (const att of attachments) {
    const path = `email-attachments/${Date.now()}-${att.filename}`;
    const { error: upErr } = await db.storage.from(bucket).upload(path, att.content, {
      contentType: att.contentType || 'application/octet-stream',
      upsert: true,
    });
    if (!upErr) {
      const { data: urlData } = db.storage.from(bucket).getPublicUrl(path);
      attachmentUrls.push({ url: urlData.publicUrl, name: att.filename, type: att.contentType || 'application/octet-stream' });
    }
  }
  const { data: ticket, error } = await db
    .from('tickets')
    .insert({
      ticket_number: ticketNumber,
      user_id: agentId,
      assigned_to_array: [agentId],
      client: senderEmail,
      issue: body,
      status: 'open',
      severity: 'MEDIUM',
      location: 'remote',
      ticket_source: 'email',
      ticket_mailbox: mailbox.mailbox_address,
      client_email: senderEmail,
      updates: [],
      time_logs: [initialTimeLog],
      total_time_minutes: 0,
      attachments: attachmentUrls,
    })
    .select('id, ticket_number')
    .single();
  if (error) {
    await logEmailEvent('email_parse_error', { mailbox_address: mailbox.mailbox_address, message_id: messageId, error: error.message }, db);
    return null;
  }
  await logEmailEvent('ticket_created', {
    mailbox_address: mailbox.mailbox_address,
    ticket_id: ticket.id,
    message_id: messageId,
    ticket_number: ticket.ticket_number,
  }, db);
  return { ticketId: ticket.id, ticketNumber: ticket.ticket_number };
}

/** Add a comment to an existing ticket (from client reply). */
export async function addCommentFromEmail(
  ticketId: string,
  body: string,
  senderEmail: string,
  attachments: { filename: string; content: Buffer; contentType?: string }[],
  messageId: string,
  supabase?: SupabaseClient
): Promise<boolean> {
  const db = supabase ?? getSupabaseAdmin();
  const { data: ticket, error: fetchErr } = await db
    .from('tickets')
    .select('updates')
    .eq('id', ticketId)
    .single();
  if (fetchErr || !ticket) return false;
  const attachmentUrls: { url: string; name: string; type: string }[] = [];
  const bucket = 'tickets';
  for (const att of attachments) {
    const path = `email-attachments/${Date.now()}-${att.filename}`;
    const { error: upErr } = await db.storage.from(bucket).upload(path, att.content, {
      contentType: att.contentType || 'application/octet-stream',
      upsert: true,
    });
    if (!upErr) {
      const { data: urlData } = db.storage.from(bucket).getPublicUrl(path);
      attachmentUrls.push({ url: urlData.publicUrl, name: att.filename, type: att.contentType || 'application/octet-stream' });
    }
  }
  const newEntry = {
    text: body.trim(),
    timestamp: new Date().toISOString(),
    authorRole: 'client' as const,
    authorEmail: senderEmail,
    attachments: attachmentUrls.length ? attachmentUrls : undefined,
  };
  const existingUpdates = Array.isArray((ticket as { updates?: unknown[] }).updates) ? (ticket as { updates: unknown[] }).updates : [];
  const updatedUpdates = [...existingUpdates, newEntry];
  const { error: updateErr } = await db.from('tickets').update({ updates: updatedUpdates }).eq('id', ticketId);
  if (updateErr) return false;
  await logEmailEvent('ticket_updated_from_email', { ticket_id: ticketId, message_id: messageId }, db);
  return true;
}

/** Find ticket by ticket_number (from subject e.g. [Ticket #CB-20260205-001] or [Ticket #1234]). */
async function findTicketByNumber(ticketNumber: string, supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase
    .from('tickets')
    .select('id')
    .eq('ticket_number', ticketNumber.trim())
    .maybeSingle();
  return data ? (data as { id: string }).id : null;
}

/** Process one mailbox: connect IMAP, fetch unread, create/update tickets, mark processed. */
export async function processOneMailbox(
  mailbox: SupportMailbox,
  supabase?: SupabaseClient
): Promise<{ processed: number; errors: string[] }> {
  const db = supabase ?? getSupabaseAdmin();
  const errors: string[] = [];
  let processed = 0;
  const password = mailbox.password_encrypted || process.env[`MAILBOX_PASSWORD_${mailbox.id}`] || '';
  if (!password) {
    errors.push(`No password for mailbox ${mailbox.mailbox_address}`);
    return { processed: 0, errors };
  }
  const client = new ImapFlow({
    host: mailbox.imap_server,
    port: mailbox.imap_port,
    secure: mailbox.imap_port === 993,
    auth: { user: mailbox.username, pass: password },
  });
  try {
    await client.connect();
    let lock = await client.getMailboxLock('INBOX');
    try {
      const unseen = await client.search({ seen: false }, { uid: true });
      const list = Array.isArray(unseen) ? unseen : [];
      for (const uid of list) {
        try {
          const msg = await client.fetchOne(uid, { source: true, envelope: true }, { uid: true });
          const raw = (msg as { source?: Buffer }).source;
          if (!raw) continue;
          const parsed = await simpleParser(raw);
          const messageId = (parsed.messageId || '').trim() || `uid-${uid}`;
          if (await isEmailProcessed(messageId, db)) continue;
          const from = parsed.from?.text || '';
          if (shouldIgnoreSender(from)) continue;
          const senderEmail = parsed.from?.value?.[0]?.address || from.split('<').pop()?.replace('>', '').trim() || '';
          const subject = parsed.subject || '(No subject)';
          const body = parseEmailBody(parsed);
          const attachments = (parsed.attachments || []).map((a) => ({
            filename: a.filename || 'attachment',
            content: a.content,
            contentType: a.contentType,
          }));
          await logEmailEvent('email_received', {
            mailbox_address: mailbox.mailbox_address,
            message_id: messageId,
            subject,
            from: senderEmail,
          }, db);
          const ticketNum = extractTicketNumberFromSubject(subject);
          if (ticketNum) {
            const ticketId = await findTicketByNumber(ticketNum, db);
            if (ticketId) {
              const ok = await addCommentFromEmail(ticketId, body, senderEmail, attachments, messageId, db);
              if (ok) processed++;
            }
          } else {
            const result = await createTicketFromEmail(
              mailbox,
              subject,
              body,
              senderEmail,
              attachments,
              messageId,
              db
            );
            if (result) processed++;
          }
          await markEmailProcessed(messageId, db);
          await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          errors.push(`UID ${uid}: ${msg}`);
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`Connection ${mailbox.mailbox_address}: ${msg}`);
  }
  return { processed, errors };
}

/** Process all active mailboxes. Call from cron (e.g. every 30s). */
export async function processAllMailboxes(supabase?: SupabaseClient): Promise<{ processed: number; errors: string[] }> {
  const mailboxes = await getActiveMailboxes(supabase);
  let totalProcessed = 0;
  const allErrors: string[] = [];
  for (const m of mailboxes) {
    const result = await processOneMailbox(m, supabase);
    totalProcessed += result.processed;
    allErrors.push(...result.errors);
  }
  return { processed: totalProcessed, errors: allErrors };
}

/** Send reply email to client when technician adds a comment. FROM ticket_mailbox, TO client_email, subject [Ticket #N] ... */
export async function sendTicketReplyEmail(
  ticketId: string,
  commentText: string,
  supabase?: SupabaseClient
): Promise<{ sent: boolean; error?: string }> {
  const db = supabase ?? getSupabaseAdmin();
  const { data: ticket, error: fetchErr } = await db
    .from('tickets')
    .select('ticket_number, issue, ticket_mailbox, client_email')
    .eq('id', ticketId)
    .single();
  if (fetchErr || !ticket) return { sent: false, error: 'Ticket not found' };
  const mailboxAddr = (ticket as { ticket_mailbox?: string }).ticket_mailbox;
  const clientEmail = (ticket as { client_email?: string }).client_email;
  if (!mailboxAddr || !clientEmail) return { sent: false, error: 'Ticket has no mailbox or client email' };
  const { data: mailbox } = await db
    .from('support_mailboxes')
    .select('*')
    .eq('mailbox_address', mailboxAddr)
    .eq('is_active', true)
    .single();
  if (!mailbox) return { sent: false, error: 'Mailbox not configured or inactive' };
  const mb = mailbox as SupportMailbox;
  const password = mb.password_encrypted || process.env[`MAILBOX_PASSWORD_${mb.id}`] || '';
  if (!password) return { sent: false, error: 'No password for mailbox' };
  const ticketNumber = (ticket as { ticket_number: string }).ticket_number;
  const issue = (ticket as { issue?: string }).issue || '';
  const subject = `[Ticket #${ticketNumber}] ${(issue || 'Support request').slice(0, 80)}${(issue || '').length > 80 ? '...' : ''}`;
  const transporter = nodemailer.createTransport({
    host: mb.smtp_server,
    port: mb.smtp_port,
    secure: mb.smtp_port === 465,
    auth: { user: mb.username, pass: password },
  });
  try {
    await transporter.sendMail({
      from: mb.mailbox_address,
      to: clientEmail,
      subject,
      text: commentText,
    });
    await logEmailEvent('email_sent', {
      mailbox_address: mailboxAddr,
      ticket_id: ticketId,
      to: clientEmail,
    }, db);
    return { sent: true };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    await logEmailEvent('email_parse_error', { mailbox_address: mailboxAddr, ticket_id: ticketId, error: err }, db);
    return { sent: false, error: err };
  }
}
