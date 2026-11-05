# Support Calls V4 — apply for reporter / ETA / referral

Run **`SUPPORT_CALLS_V4.sql`** in the Supabase SQL editor (after V3).

It adds:

- `reporter_contact`, `client_houston_userid`
- ETA sent-to-client columns (`eta_sent_event_id`, `eta_sent_at`, `eta_sent_by`)
- Partner-required flags on the support call
- Contribution/assignment referral + completion category
- Visit `client_idempotency_key` (unique per call) for offline retries
- Optional `support_call_hardware_items.document_id` for hardware photos

Do **not** wipe existing data.

If you already ran an earlier V4 draft, re-run the file — remaining statements use `IF NOT EXISTS` / exception guards.
