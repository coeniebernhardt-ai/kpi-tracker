# Office 365 mailbox security (ThinkQ email-to-ticket)

## Is using Office 365 mailboxes directly secure?

**Yes.** IMAP over port 993 uses TLS; traffic between your app and Microsoft is encrypted. Many helpdesk systems use this pattern.

---

## What the code expects

In **`app/lib/email-to-ticket.ts`** the mailbox password is used **as-is** for IMAP/SMTP auth:

- `mailbox.password_encrypted` is read directly (no decryption step).
- Fallback: `process.env.MAILBOX_PASSWORD_<mailbox.id>`.

So the column name is legacy: you store the **App Password** (or password) in that column or in env. The integration works whether the value is plain or pre-encrypted; the code does not decrypt.

---

## Recommended: App Passwords

1. Go to **https://mysignins.microsoft.com/security-info**
2. Create an **App password** (e.g. `abcd efgh ijkl mnop`).
3. In Supabase, set that value for the mailbox:
   - `UPDATE support_mailboxes SET password_encrypted = 'yourapppassword' WHERE mailbox_address = 'support@thinkdigital.co.za';`
4. Use **dedicated mailboxes** (e.g. `support@thinkdigital.co.za`, `support@gowaterfall.co.za`), not personal mailboxes.

App passwords limit scope to mail access and can be revoked without changing the user’s main password.

---

## Endpoint protection

- **`/api/check-mailbox`** and **`/api/cron/process-email`** should be called only by your cron (or a trusted worker).
- Set **`CRON_SECRET`** in Vercel (and in any worker that calls these routes). The routes require `Authorization: Bearer <CRON_SECRET>` when the secret is set.

---

## Polling interval

- **Vercel cron** is set to run **`/api/check-mailbox`** every **10 minutes** (and `/api/cron/process-email` every minute). You can change this to every **5 minutes** in `vercel.json` if you prefer.
- For real-time ingestion, use the **webhook** `POST /api/email/ingest` so the mail relay posts to your app instead of polling.

---

## Attachments

Attachments are stored in Supabase Storage (e.g. `tickets` bucket). Restrict bucket access to authenticated users; consider size limits and blocking executable types in storage or app logic.

---

## Optional: background worker

If you need higher reliability than serverless cron (e.g. avoid timeouts on large mailboxes), run a **long-running worker** (e.g. small VM or a service like Inngest/Trigger.dev) that:

1. Connects to IMAP on a schedule (e.g. every 5 min).
2. Fetches unread messages and either:
   - Calls your existing **`POST /api/email/ingest`** with parsed payload, or
   - Writes to a queue that your app consumes.

That keeps the same ticket-creation logic in ThinkQ and only changes *who* triggers the poll.
