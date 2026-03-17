# Email ingest API – JSON schema for providers

**Endpoint:** `POST https://kpi-tracker-six.vercel.app/api/email/ingest`  
**Content-Type:** `application/json`

Your email provider (e.g. SendGrid Inbound Parse, Mailgun, Postmark, or a custom relay) should POST a JSON body in one of the following shapes. The handler also accepts **raw email** (see below).

---

## Required fields

| Field | Type | Description |
|-------|------|-------------|
| `sender_email` or `from` | string | Sender email address (e.g. `"client@example.com"`). |
| `subject` | string | Email subject. Used for threading: if it contains `[Ticket #123]`, the body is added as a comment to that ticket. |
| `body` or `text` | string | Plain-text body of the email. HTML-only emails: send HTML and we strip tags. |
| `message_id` | string | Unique id for deduplication (e.g. SMTP Message-ID or provider id). Duplicates are ignored. |
| `mailbox_address` | string | Which support mailbox received this. One of: `support@thinkdigital.co.za`, `support@gowaterfall.co.za`, `supportq@thinkdigital.co.za`. Can be sent in the JSON body or in the `X-Mailbox` request header. |

---

## Optional fields

| Field | Type | Description |
|-------|------|-------------|
| `attachments` | array | Each item: `{ "filename": string, "content": string (base64), "content_type"?: string }`. |
| `html` | string | If present and `body`/`text` is empty, we use this and strip HTML to get plain text. |
| `to` | string | For logging only. |
| `date` | string | For logging only. |

---

## Example payload (minimal)

```json
{
  "sender_email": "john@example.com",
  "subject": "Gate camera offline",
  "body": "The gate camera at Block B has been offline since this morning.",
  "message_id": "provider-msg-abc123",
  "mailbox_address": "support@thinkdigital.co.za"
}
```

## Example with attachments

```json
{
  "from": "jane@company.com",
  "subject": "Invoice attached",
  "text": "Please find the invoice attached.",
  "message_id": "<unique-id@mail.gw>",
  "mailbox_address": "support@gowaterfall.co.za",
  "attachments": [
    {
      "filename": "invoice.pdf",
      "content": "JVBERi0xLjQKJeLjz9MK...",
      "content_type": "application/pdf"
    }
  ]
}
```

---

## Raw email (alternative)

You can POST the **raw RFC 822 email** instead of JSON:

- **Content-Type:** `text/plain`, `message/rfc822`, or `multipart/*`
- **Body:** Raw email bytes (e.g. as received from SMTP)
- **Header:** Set `X-Mailbox` to the receiving mailbox (e.g. `support@thinkdigital.co.za`, `supportq@thinkdigital.co.za`, `support@gowaterfall.co.za`) so we know which mailbox received it.

We parse it with `mailparser` and then run the same logic (dedupe, thread detection, create ticket or add comment).

---

## Response

- **200** – Request accepted. Body:
  - `{ "success": true, "processed": true }` – New ticket created or comment added.
  - `{ "success": true, "processed": false, "reason": "duplicate" | "ignored_sender" | "comment_failed" | "create_failed" }` – Not processed (e.g. duplicate or loop sender).
- **400** – Bad request (missing/invalid `mailbox_address`, invalid JSON, or missing required fields).
- **500** – Server error.

---

## Mailbox addresses

Only these addresses are accepted for `mailbox_address` (or `X-Mailbox`):

- `support@thinkdigital.co.za`
- `support@gowaterfall.co.za`
- `supportq@thinkdigital.co.za`

Each must exist in the `support_mailboxes` table in Supabase.
