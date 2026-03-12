# ThinkQ/FinQ Email-to-Ticket (Single Mailbox + Intelligent Routing)

## Overview

- **Single mailbox:** All support email is received at **support@thinkdigital.co.za**. Incoming messages create tickets or add comments; outbound replies are always sent **from** this address.
- **Intelligent routing:** New tickets are auto-assigned using: (1) known sender → estate (Balwin → Cornett, Redefine → Marcellus), (2) learned routing rules (email or domain → agent), (3) default agent Cornett.
- **Learning:** When a technician assigns or reassigns a ticket that has `client_email`, the system stores a routing rule (email + domain → agent). Future emails from that sender or domain are routed to that agent.
- **Threading:** Outbound subject format is `[Ticket #display_id]` (or `[Ticket #ticket_number]` if no display_id). Incoming replies with that pattern are matched to the existing ticket and added as a comment.

## 1. Database setup (order)

1. Run **`EMAIL_TO_TICKET_SCHEMA.sql`** – tables `support_mailboxes`, `processed_emails`, `email_log`, and ticket columns.
2. Run **`EMAIL_TO_TICKET_ROUTING_SCHEMA.sql`** – `ticket_display_id_seq`, `tickets.display_id`, `sender_estate`, `routing_rules`, trigger to set `display_id` on insert, trigger to learn routing on assignment change.
3. Run **`EMAIL_TO_TICKET_MAILBOXES.sql`** – inserts the single mailbox **support@thinkdigital.co.za** with default agent Cornett.
4. Set **password_encrypted** for that mailbox (Table Editor or `UPDATE support_mailboxes SET password_encrypted = '...' WHERE mailbox_address = 'support@thinkdigital.co.za'`).

## 2. Sender → estate (Step 1 routing)

Populate **`sender_estate`** from your system user/client data so that known senders map to an estate:

- **Balwin** → tickets are assigned to **Cornett**
- **Redefine** → tickets are assigned to **Marcellus**

Example:

```sql
INSERT INTO sender_estate (email_address, estate_name)
VALUES
  ('client1@example.com', 'Balwin'),
  ('client2@example.com', 'Redefine')
ON CONFLICT (email_address) DO UPDATE SET estate_name = EXCLUDED.estate_name;
```

Use lowercase `email_address`. Estate names are matched case-insensitively for Balwin/Redefine.

## 3. Routing rules (Step 2) and default (Step 3)

- **Step 2:** Table **`routing_rules`** stores learned and manual rules: `email_address` and/or `email_domain` → `assigned_agent_id`. Priority: exact email first, then domain.
- **Step 3:** If no rule matches, the **default agent** is Cornett (from the support mailbox config).
- **Learning:** When a technician changes assignment on a ticket that has `client_email`, a trigger inserts/updates `routing_rules` and logs `routing_rule_created` in `email_log`. No change to the existing assignment UI.

## 4. Cron (mail listener)

- **`POST /api/cron/process-email`** – connects to support@thinkdigital.co.za via IMAP, fetches unread emails every run, creates tickets or adds comments, marks processed, logs to `email_log`.
- Poll every **30–60 seconds** (e.g. Vercel Cron every minute). Secure with **`CRON_SECRET`** in env and `Authorization: Bearer <CRON_SECRET>`.

## 5. Outbound when technician replies

- When an admin adds a comment in ThinkQ, **`POST /api/admin/ticket-comment`** adds the comment and, if the ticket has **client_email**, sends an email to the client **from support@thinkdigital.co.za** with subject **`[Ticket #display_id]`** (or ticket_number if no display_id).

## 6. Log events

- `email_received`, `ticket_created`, `ticket_updated_from_email`, **`ticket_auto_assigned`**, **`routing_rule_created`**, `email_sent`, `email_parse_error`.

## 7. Assignment UI

- Existing ThinkQ assignment and “add team member” behaviour is unchanged. Intelligent routing only sets the **initial** assignee when a ticket is created from email; technicians can still reassign and add members, and those changes are used to learn new routing rules.
