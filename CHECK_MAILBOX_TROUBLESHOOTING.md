# Email not showing as Pending ticket – checklist

If emails to **supportq@thinkdigital.co.za** (or other support mailboxes) are not appearing as pending tickets:

## 1. Mailbox row in Supabase

- Run **`ADD_SUPPORTQ_MAILBOX.sql`** in Supabase → SQL Editor (if not already run).
- Confirm a row exists:  
  `SELECT mailbox_address, is_active, (password_encrypted IS NOT NULL) AS has_password FROM support_mailboxes WHERE mailbox_address = 'supportq@thinkdigital.co.za';`  
  You want `is_active = true` and `has_password = true`.

## 2. App Password set

- In Supabase SQL Editor:  
  `UPDATE support_mailboxes SET password_encrypted = 'your-app-password' WHERE mailbox_address = 'supportq@thinkdigital.co.za';`
- Use a **Microsoft 365 App Password** for the account that owns the mailbox (e.g. ThinkQ@thinkdigital.co.za), not the normal account password.
- Create one in Microsoft 365: Security → Advanced security → App passwords.

## 3. IMAP enabled for the mailbox

- In **Microsoft 365 admin** (or Azure AD): select the user/mailbox → Mail → **Manage email apps** → enable **IMAP**.
- The mailbox that receives the email (e.g. supportq@thinkdigital.co.za as alias) must be the one with IMAP on, and the **username** in `support_mailboxes` must be the sign-in address (e.g. thinkq@thinkdigital.co.za).

## 4. Check-mailbox endpoint and cron

- **Verify setup (no auth):**  
  Open: `https://your-deployment-url.vercel.app/api/check-mailbox`  
  You should see JSON with `mailboxesConfigured` and `mailboxesWithPassword`. If either is 0, fix steps 1–2.
- **Vercel Cron runs on production only.** The job that runs every 5 minutes is attached to the **production** deployment (main branch), not preview. So:
  - Emails are picked up on the **production** app (e.g. kpi-tracker-six.vercel.app).
  - On a **preview** URL, the cron does not run; to test there, trigger a run manually (see below).

## 5. Manually trigger a run (for testing)

From a terminal (replace with your real URL and secret):

```bash
curl -X POST "https://your-app.vercel.app/api/check-mailbox" -H "Authorization: Bearer YOUR_CRON_SECRET"
```

- Use the **same** Vercel deployment URL where you expect tickets (production if that’s where cron runs).
- `CRON_SECRET` must be set in Vercel → Project → Settings → Environment Variables for that deployment.

## 6. Email must be unread

- The system only processes **unread** messages in INBOX.
- If the message was already read (e.g. in Outlook), mark it unread or send a **new** test email and leave it unread until the next cron run (or manual POST).

## 7. Duplicate protection

- Each email is deduplicated by `message_id`. If the same message was already processed (e.g. by a previous run), it will not create a second ticket. Send a **new** test email to confirm.

---

**Quick test:** Send a new email to supportq@thinkdigital.co.za, leave it unread, wait up to 5 minutes on **production**, or call `POST /api/check-mailbox` with `Authorization: Bearer CRON_SECRET` on the deployment you’re testing.
