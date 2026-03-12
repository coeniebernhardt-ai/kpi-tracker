# ThinkQ/FinQ Email-to-Ticket (Two Mailboxes + Pending Queue + Intelligent Routing)

## Overview

- **Two mailboxes:** **support@thinkdigital.co.za** and **support@gowaterfall.co.za**. Both are monitored via IMAP; outbound replies are sent **from** the mailbox that received the ticket (`ticket_mailbox`).
- **Ticket statuses:** `pending`, `open`, `closed`. **Pending** = created from email but not yet assigned; they appear in the Pending queue until a technician assigns them (then status becomes `open`).
- **Intelligent routing:** When a new email arrives, the system checks **routing memory** only (no default agent): (1) optional sender → estate (Balwin → Cornett, Redefine → Marcellus), (2) learned routing rules (email or domain → agent). If a rule matches → ticket is created with that agent and **status = open**. If **no rule matches** → ticket is created with **status = pending**, **user_id = null** (Pending queue).
- **Learning:** When a technician assigns a pending ticket (or reassigns any ticket) that has `client_email`, a trigger stores a routing rule. Future emails from that sender or domain are auto-assigned to that agent.
- **Threading:** Outbound subject format is `[Ticket #display_id]` (or `[Ticket #ticket_number]`). Incoming replies with that pattern add a comment; if the ticket was **closed**, it is **reopened** (status = open).

## 1. Database setup (order)

1. Run **`RUN_EMAIL_TO_TICKET_SQL.sql`** (recommended) – schema, routing, both mailboxes, and **pending** status in one script. Or run in order: `EMAIL_TO_TICKET_SCHEMA.sql`, `EMAIL_TO_TICKET_ROUTING_SCHEMA.sql`, `EMAIL_TO_TICKET_MAILBOXES.sql`, **`ADD_PENDING_STATUS.sql`**.
2. Set **password_encrypted** for each mailbox:
   - `UPDATE support_mailboxes SET password_encrypted = '...' WHERE mailbox_address = 'support@thinkdigital.co.za';`
   - `UPDATE support_mailboxes SET password_encrypted = '...' WHERE mailbox_address = 'support@gowaterfall.co.za';`

## 2. Sender → estate (optional routing)

Populate **`sender_estate`** so that known senders map to an estate (e.g. Balwin → Cornett, Redefine → Marcellus). Use lowercase `email_address`.

## 3. Routing rules and Pending queue

- **Routing rules only:** Table **`routing_rules`** (and optional **`sender_estate`**). Priority: exact email, then domain. **No default agent** – if no rule matches, the ticket is created as **pending** (unassigned).
- **Pending queue:** In the admin dashboard, filter by **Pending Only** to see unassigned email-created tickets. Use **Assign Members** to assign a technician; the ticket’s **status** is set to **open** and the routing rule is learned for next time.

## 4. Office 365 setup (IMAP)

- In **Microsoft 365 admin** → Users → Active Users → select the mailbox (e.g. support@thinkdigital.co.za) → **Mail** → **Manage email apps** → enable **IMAP** and **Authenticated SMTP**.
- Create an **App password** at https://mysignins.microsoft.com/security-info and store it in `support_mailboxes.password_encrypted` (or in env as `MAILBOX_PASSWORD_<mailbox_id>`). See **`EMAIL_MAILBOX_SECURITY.md`** for security notes.

## 5. Cron (mail listener)

- **`POST /api/check-mailbox`** – connects to both mailboxes via IMAP, fetches unread emails, creates tickets (open or pending) or adds comments, marks processed. Runs every **5 minutes** (Vercel Cron). Secure with **`CRON_SECRET`**.
- **`POST /api/cron/process-email`** – same logic; optional backup cron. Secure with **`CRON_SECRET`**.

## 6. Outbound when technician replies

- When an admin adds a comment, **`POST /api/admin/ticket-comment`** adds the comment and, if the ticket has **client_email**, sends an email to the client **from the ticket’s mailbox** (`ticket_mailbox` – thinkdigital or gowaterfall) with subject **`[Ticket #display_id]`** (or ticket_number).

## 7. Log events

- `email_received`, `ticket_created`, `ticket_updated_from_email`, `ticket_auto_assigned`, `routing_rule_created`, `email_sent`, `email_parse_error`.

## 8. Assignment UI

- **Pending tickets:** Open a pending ticket → **Assign Members** → choose an agent. The ticket’s **status** becomes **open** and the system learns the routing rule for that sender/domain.
- Existing “add team member” and reassignment behaviour is unchanged; learning applies whenever assignment changes on a ticket with `client_email`.
