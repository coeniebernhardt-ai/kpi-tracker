# ThinkQ Email-to-Ticket Integration

## Overview

- **Inbound:** Emails to support mailboxes create tickets or add comments to existing tickets (when subject contains `[Ticket #<ticket_number>]`).
- **Outbound:** When a technician adds a comment in ThinkQ, an email is sent to the client from the ticket’s mailbox (if `client_email` and `ticket_mailbox` are set).

## 1. Database setup

Run **`EMAIL_TO_TICKET_SCHEMA.sql`** in the Supabase SQL Editor. This creates:

- `support_mailboxes` – mailbox config (IMAP/SMTP, default agent)
- `processed_emails` – `message_id` for duplicate protection
- `email_log` – events: `email_received`, `ticket_created`, `ticket_updated_from_email`, `email_sent`, `email_parse_error`
- New columns on `tickets`: `ticket_source`, `ticket_mailbox`, `client_email`

## 2. Mailbox configuration and default agents

**Monitored mailboxes and default assignment:**

| Mailbox | Default agent |
|--------|----------------|
| support@balwin.com | Cornett |
| support@redefine.com | Marcellus |
| support@gowaterfall.com | Coenie |

When a ticket is created from an email, it is **immediately assigned** to that mailbox’s default agent. Agents can still **reassign** tickets or **add additional team members** using the existing ThinkQ UI; the default only applies at automatic creation.

Run **`EMAIL_TO_TICKET_MAILBOXES.sql`** in the Supabase SQL Editor **after** `EMAIL_TO_TICKET_SCHEMA.sql`. It inserts the three mailboxes and links each to the correct agent by matching `profiles.full_name` (Cornett, Marcellus, Coenie). If your display names differ, edit the script’s `ILIKE` patterns or update `default_assigned_agent_id` in the table after running. Then set each mailbox’s app password in `password_encrypted` (see script comments).

## 3. Cron (mail listener)

The app exposes **`POST /api/cron/process-email`**, which:

- Connects to each active mailbox via IMAP
- Fetches unread messages, parses them, and either creates a ticket or adds a comment
- Marks messages as processed and logs to `email_log`

**Vercel:** `vercel.json` is set so this route runs every minute. Set **`CRON_SECRET`** in Vercel env and ensure the cron job sends:

`Authorization: Bearer <CRON_SECRET>`.

**External cron:** Call the URL every 30–60 seconds with the same header.

## 4. Outbound email when technician replies

When an admin adds a comment via the admin UI, the app calls **`POST /api/admin/ticket-comment`**, which:

1. Adds the comment to the ticket (same as before)
2. If the ticket has `client_email` and `ticket_mailbox`, sends an email to the client from that mailbox with subject `[Ticket #<ticket_number>] <original subject>`.

No change for tickets created manually; only email-originated tickets get automatic replies.

## 5. Behaviour summary

| Incoming email subject              | Action |
|------------------------------------|--------|
| No `[Ticket #...]`                 | Create new ticket; assign to mailbox default agent; set `ticket_source=email`, `ticket_mailbox`, `client_email` |
| Contains `[Ticket #CB-20260205-001]` | Find ticket with that `ticket_number`, add comment (body + attachments), author = client email |

- **Loop protection:** Messages from senders containing `no-reply`, `mailer-daemon`, `donotreply`, `auto-reply`, etc. are ignored.
- **Duplicate protection:** Each processed `message_id` is stored in `processed_emails`; duplicates are skipped.
- **Attachments:** Inbound attachments are uploaded to the `tickets` storage bucket and linked to the ticket or comment.

## 6. Optional: Admin UI for mailboxes

You can add an admin page or API to list/edit `support_mailboxes` (with masked passwords). For now, configure mailboxes via SQL or Supabase Dashboard.
