# Support Calls V3 — apply for completion + offline sync

Run **`SUPPORT_CALLS_V3.sql`** in the Supabase SQL editor (after V2).

It adds:

- `support_call_assignments.work_completed_at` / `work_completed_by` (member COMPLETE MY WORK)
- Same completion columns on `support_call_partners`
- `support_call_sync_conflicts` for offline/online divergence (HTO resolve; no last-write-wins)
- `REPLICA IDENTITY FULL` on key child tables + realtime publication for sync conflicts

Do **not** wipe existing data. Unrelated Think-Q tables are not dropped.
