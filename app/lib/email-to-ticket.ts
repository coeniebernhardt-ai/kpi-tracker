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
  | 'ticket_auto_assigned'
  | 'routing_rule_created'
  | 'email_sent'
  | 'email_parse_error';

export function getSupabaseAdmin(): SupabaseClient {
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

/** Strip signatures, quoted reply blocks, and normalize whitespace. Used by webhook ingest. */
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

/** Extract ticket ref from subject: [Ticket #1234] or [Ticket #CB-20260205-001] */
function extractTicketRefFromSubject(subject: string): string | null {
  const m = subject.match(TICKET_REF_REGEX);
  return m ? m[1].trim() : null;
}

function getSenderDomain(email: string): string {
  const part = email.split('@')[1];
  return part ? part.toLowerCase().trim() : '';
}

/** Routing memory only: routing_rules (email then domain). No default — no match → pending queue. */
async function resolveAssignedAgent(
  senderEmail: string,
  senderDomain: string,
  supabase: SupabaseClient
): Promise<{ agentId: string; source: 'estate' | 'routing_rule' } | null> {
  const email = senderEmail.toLowerCase().trim();
  const domain = senderDomain || getSenderDomain(senderEmail);

  // Optional: known sender → estate (e.g. Balwin=Cornett, Redefine=Marcellus)
  const { data: estateRow } = await supabase
    .from('sender_estate')
    .select('estate_name')
    .eq('email_address', email)
    .maybeSingle();
  if (estateRow) {
    const estate = (estateRow as { estate_name: string }).estate_name;
    const nameMatch = estate.toLowerCase().includes('balwin') ? '%Cornett%' : estate.toLowerCase().includes('redefine') ? '%Marcellus%' : null;
    if (nameMatch) {
      const { data: profile } = await supabase.from('profiles').select('id').ilike('full_name', nameMatch).limit(1).maybeSingle();
      if (profile) return { agentId: (profile as { id: string }).id, source: 'estate' };
    }
  }

  // Step 1: Exact email in routing_rules
  const { data: ruleByEmail } = await supabase
    .from('routing_rules')
    .select('assigned_agent_id')
    .eq('email_address', email)
    .not('email_address', 'is', null)
    .limit(1)
    .maybeSingle();
  if (ruleByEmail) return { agentId: (ruleByEmail as { assigned_agent_id: string }).assigned_agent_id, source: 'routing_rule' };

  // Step 2: Domain in routing_rules
  if (domain) {
    const { data: ruleByDomain } = await supabase
      .from('routing_rules')
      .select('assigned_agent_id')
      .eq('email_domain', domain)
      .not('email_domain', 'is', null)
      .limit(1)
      .maybeSingle();
    if (ruleByDomain) return { agentId: (ruleByDomain as { assigned_agent_id: string }).assigned_agent_id, source: 'routing_rule' };
  }

  // No match → ticket goes to Pending queue (return null)
  return null;
}

/** Generate ticket_number for assigned agent (open tickets from email). */
async function generateEmailTicketNumber(
  agentId: string,
  supabase: SupabaseClient
): Promise<string> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', agentId)
    .single();
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'EM'
    : 'EM';
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const { count } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', agentId)
    .gte('created_at', today.toISOString().slice(0, 10));
  const seq = String((count ?? 0) + 1).padStart(3, '0');
  return `${initials}-${dateStr}-${seq}`;
}

/** Generate ticket_number for pending (unassigned) email-created tickets: PEND-YYYYMMDD-XXX. */
async function generatePendingTicketNumber(supabase: SupabaseClient): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const dayStart = today.toISOString().slice(0, 10) + 'T00:00:00.000Z';
  const { count } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
    .gte('created_at', dayStart);
  const seq = String((count ?? 0) + 1).padStart(3, '0');
  return `PEND-${dateStr}-${seq}`;
}

/** Create a new ticket from an incoming email. Routing match → open + assigned; no match → pending (unassigned). */
export async function createTicketFromEmail(
  mailbox: SupportMailbox,
  subject: string,
  body: string,
  senderEmail: string,
  attachments: { filename: string; content: Buffer; contentType?: string }[],
  messageId: string,
  supabase?: SupabaseClient
): Promise<{ ticketId: string; ticketNumber: string; displayId?: number } | null> {
  const db = supabase ?? getSupabaseAdmin();
  const senderDomain = getSenderDomain(senderEmail);
  const resolved = await resolveAssignedAgent(senderEmail, senderDomain, db);

  const isAssigned = !!resolved?.agentId;
  const agentId = resolved?.agentId ?? null;
  const ticketNumber = isAssigned && agentId
    ? await generateEmailTicketNumber(agentId, db)
    : await generatePendingTicketNumber(db);

  const now = new Date();
  const initialTimeLog = {
    minutes: 0,
    description: isAssigned ? 'Ticket opened' : 'Ticket created (pending assignment)',
    timestamp: now.toISOString(),
    logged_by: 'System',
  };
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

  const insertRow: Record<string, unknown> = {
    ticket_number: ticketNumber,
    user_id: agentId,
    assigned_to_array: agentId ? [agentId] : [],
    client: senderEmail,
    issue: body,
    status: isAssigned ? 'open' : 'pending',
    severity: 'MEDIUM',
    location: 'remote',
    ticket_source: 'email',
    ticket_mailbox: mailbox.mailbox_address,
    client_email: senderEmail,
    updates: [],
    time_logs: [initialTimeLog],
    total_time_minutes: 0,
    attachments: attachmentUrls,
  };

  const { data: ticket, error } = await db
    .from('tickets')
    .insert(insertRow)
    .select('id, ticket_number, display_id')
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
    display_id: (ticket as { display_id?: number }).display_id,
    status: isAssigned ? 'open' : 'pending',
  }, db);
  if (resolved) {
    await logEmailEvent('ticket_auto_assigned', {
      ticket_id: ticket.id,
      assigned_agent_id: agentId,
      source: resolved.source,
      sender_email: senderEmail,
    }, db);
  }
  return {
    ticketId: ticket.id,
    ticketNumber: ticket.ticket_number,
    displayId: (ticket as { display_id?: number }).display_id,
  };
}

/** Add a comment to an existing ticket (from client reply). If ticket was closed, reopen (status = open). */
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
    .select('updates, status')
    .eq('id', ticketId)
    .single();
  if (fetchErr || !ticket) return false;
  const wasClosed = (ticket as { status?: string }).status === 'closed';
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
  const updatePayload: Record<string, unknown> = { updates: updatedUpdates };
  if (wasClosed) updatePayload.status = 'open';
  const { error: updateErr } = await db.from('tickets').update(updatePayload).eq('id', ticketId);
  if (updateErr) return false;
  await logEmailEvent('ticket_updated_from_email', { ticket_id: ticketId, message_id: messageId, reopened: wasClosed }, db);
  return true;
}

/** Find ticket by ref from subject: [Ticket #1234] (display_id) or [Ticket #CB-20260205-001] (ticket_number). */
export async function findTicketByRef(ref: string, supabase?: SupabaseClient): Promise<string | null> {
  const db = supabase ?? getSupabaseAdmin();
  const trimmed = ref.trim();
  const asNum = parseInt(trimmed, 10);
  if (!Number.isNaN(asNum) && String(asNum) === trimmed) {
    const { data } = await db.from('tickets').select('id').eq('display_id', asNum).maybeSingle();
    if (data) return (data as { id: string }).id;
  }
  const { data } = await db.from('tickets').select('id').eq('ticket_number', trimmed).maybeSingle();
  return data ? (data as { id: string }).id : null;
}

/** Input for processing a single incoming email (webhook or after IMAP fetch). */
export type IncomingEmailPayload = {
  sender_email: string;
  subject: string;
  body: string;
  message_id: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
};

/**
 * Process a single incoming email: duplicate/loop check, then add comment or create ticket.
 * Used by webhook (/api/email/ingest) and by IMAP polling. Returns whether the email was processed.
 */
export async function processIncomingEmail(
  mailbox: SupportMailbox,
  payload: IncomingEmailPayload,
  supabase?: SupabaseClient
): Promise<{ processed: boolean; error?: string }> {
  const db = supabase ?? getSupabaseAdmin();
  const { sender_email, subject, body, message_id, attachments = [] } = payload;

  if (await isEmailProcessed(message_id, db)) {
    return { processed: false, error: 'duplicate' };
  }
  if (shouldIgnoreSender(sender_email)) {
    return { processed: false, error: 'ignored_sender' };
  }

  await logEmailEvent('email_received', {
    mailbox_address: mailbox.mailbox_address,
    message_id,
    subject,
    from: sender_email,
  }, db);

  const ticketRef = extractTicketRefFromSubject(subject);
  if (ticketRef) {
    const ticketId = await findTicketByRef(ticketRef, db);
    if (ticketId) {
      const ok = await addCommentFromEmail(ticketId, body, sender_email, attachments, message_id, db);
      if (ok) {
        await markEmailProcessed(message_id, db);
        return { processed: true };
      }
      return { processed: false, error: 'comment_failed' };
    }
  }

  const result = await createTicketFromEmail(
    mailbox,
    subject,
    body,
    sender_email,
    attachments,
    message_id,
    db
  );
  if (result) {
    await markEmailProcessed(message_id, db);
    return { processed: true };
  }
  return { processed: false, error: 'create_failed' };
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
          const from = parsed.from?.text || '';
          const senderEmail = parsed.from?.value?.[0]?.address || from.split('<').pop()?.replace('>', '').trim() || '';
          const subject = parsed.subject || '(No subject)';
          const body = parseEmailBody(parsed);
          const attachments = (parsed.attachments || []).map((a) => ({
            filename: a.filename || 'attachment',
            content: a.content,
            contentType: a.contentType,
          }));
          const result = await processIncomingEmail(
            mailbox,
            { sender_email: senderEmail, subject, body, message_id: messageId, attachments },
            db
          );
          if (result.processed) processed++;
          else if (result.error) errors.push(`UID ${uid}: ${result.error}`);
          if (result.processed) await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
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

/** Send reply email to client when technician adds a comment. FROM the ticket's mailbox (ticket_mailbox), subject [Ticket #display_id] or [Ticket #ticket_number]. */
export async function sendTicketReplyEmail(
  ticketId: string,
  commentText: string,
  supabase?: SupabaseClient
): Promise<{ sent: boolean; error?: string }> {
  const db = supabase ?? getSupabaseAdmin();
  const { data: ticket, error: fetchErr } = await db
    .from('tickets')
    .select('ticket_number, display_id, issue, client_email, ticket_mailbox')
    .eq('id', ticketId)
    .single();
  if (fetchErr || !ticket) return { sent: false, error: 'Ticket not found' };
  const clientEmail = (ticket as { client_email?: string }).client_email;
  if (!clientEmail) return { sent: false, error: 'Ticket has no client email' };
  const mailboxAddress = (ticket as { ticket_mailbox?: string }).ticket_mailbox;
  if (!mailboxAddress) return { sent: false, error: 'Ticket has no ticket_mailbox (cannot determine reply-from)' };
  const { data: mailbox } = await db
    .from('support_mailboxes')
    .select('*')
    .eq('mailbox_address', mailboxAddress)
    .eq('is_active', true)
    .single();
  if (!mailbox) return { sent: false, error: `Mailbox ${mailboxAddress} not configured or inactive` };
  const mb = mailbox as SupportMailbox;
  const password = mb.password_encrypted || process.env[`MAILBOX_PASSWORD_${mb.id}`] || '';
  if (!password) return { sent: false, error: `No password for mailbox ${mailboxAddress}` };
  const displayId = (ticket as { display_id?: number }).display_id;
  const ticketNumber = (ticket as { ticket_number: string }).ticket_number;
  const subjectRef = displayId != null ? String(displayId) : ticketNumber;
  const issue = (ticket as { issue?: string }).issue || 'Support request';
  const subject = `[Ticket #${subjectRef}] ${issue.slice(0, 80)}${issue.length > 80 ? '...' : ''}`;
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
      mailbox_address: mb.mailbox_address,
      ticket_id: ticketId,
      to: clientEmail,
    }, db);
    return { sent: true };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    await logEmailEvent('email_parse_error', { mailbox_address: mb.mailbox_address, ticket_id: ticketId, error: err }, db);
    return { sent: false, error: err };
  }
}
