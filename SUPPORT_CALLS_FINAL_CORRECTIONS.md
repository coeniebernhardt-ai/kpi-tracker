# Support Calls — Final Corrections delivery

Incremental fixes on `preview-deployment` (no schema wipe). Apply **`SUPPORT_CALLS_V3.sql`** before using completion / offline conflict features (see `SUPPORT_CALLS_V3_README.md`).

## Root causes addressed

| Area | Cause | Fix |
|------|--------|-----|
| Member location on Pending | `GET /api/pending-tickets` omitted location columns; Pending UI never rendered them | Select + chips for Client / Estate / CML / On-site; `from-ticket` copies `onsite_location` |
| COMPLETE MY WORK blocked | Workflow treated `submitted` contribution as awaiting HTO Accept | `work_completed_at` marks technician done; Accept optional; **Request correction** clears completion |
| HTO UI skip-around | Free accordion | Ordered WorkflowStep: completed / current / future locked |
| Sync Offline | Members subscribed to manager-only tables; no channel retry | Role-scoped tables + exponential backoff; status Synced / Connecting / Sync Pending / Sync Failed |
| Offline work loss | No durable queue | Member outbox (`localStorage`) for visits + COMPLETE MY WORK; conflicts → `support_call_sync_conflicts` |
| Finance PDF overlap | Fixed 42mm `kv` gutter | `buildFinanceReportPdf` rebuilt with `jspdf-autotable` |
| Toasts | Dead banners + no dismiss | Floating toast + Dismiss + `whitespace-pre-line`; HTO banners removed |

## Key files

- `SUPPORT_CALLS_V3.sql`, `SUPPORT_CALLS_V3_README.md`
- `app/api/pending-tickets/route.ts`, `app/dashboard/page.tsx`, `app/api/support-calls/from-ticket/route.ts`
- `app/api/support-calls/[id]/contributions/route.ts`, `…/review/route.ts`, `…/job-card/route.ts`, `…/close/route.ts`, `…/partners/route.ts`, `…/sync-conflicts/`
- `app/lib/support-calls/progress.ts`, `server.ts`, `types.ts`, `useSupportCallRealtime.ts`, `offlineOutbox.ts`, `pdf.ts`
- `app/components/support-calls/SupportCallMemberPanel.tsx`
- `app/admin/support-calls/[id]/page.tsx`
- `scripts/smoke-finance-pdf.ts` (local Finance PDF smoke)

## Manual acceptance notes

- Run V3 SQL in Supabase before COMPLETE MY WORK / conflict APIs in production-like envs.
- Confirm V2 realtime publication already applied.
- Finance smoke: `npx tsx scripts/smoke-finance-pdf.ts` → inspect `scripts/smoke-finance-handover.pdf` (do not commit the PDF binary).

## Limitations

- Offline outbox covers member visit create + COMPLETE MY WORK only (not full HTO workspace).
- Conflict resolve is HTO-facing flag + stored payloads; no automated merge UI beyond listing/API.
- Job-card PDF builder left on existing Writer path unless label overlap reappears.
