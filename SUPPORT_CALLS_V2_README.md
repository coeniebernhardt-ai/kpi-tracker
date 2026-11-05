# Support Calls V2 — apply before using new features

Run **`SUPPORT_CALLS_V2.sql`** in the Supabase SQL editor (project that backs this app).

It adds:

- Location directory tables (`support_clients` → estates → CML → on-site)
- Seed from existing ticket / support-call text
- `draft` overall status and nullable `ticket_id`
- Location FK + `onsite_location` columns
- `tickets.onsite_location`
- Realtime publication for support-call tables

Do **not** run this against production without a backup. Unrelated Think-Q tables are not dropped.
