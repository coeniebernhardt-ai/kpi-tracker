# Support Calls — Incremental Corrections (§1–15) delivery

Branch: `preview-deployment`. Apply **`SUPPORT_CALLS_V4.sql`** after V3 (see `SUPPORT_CALLS_V4_README.md`).

## Root causes → fixes

| # | Issue | Root cause | Fix |
|---|--------|------------|-----|
| 1 | Reporter clutter | Four reporter fields in create/intake | Single **Reporter Contact** + optional **Client Houston UserID** (`reporter_contact`, `client_houston_userid`) |
| 2 | ETA vs visits / send UX | ETA-to-client lived in communications with extra fields; visit duplicates from retries | ETA select + **ETA SENT TO CLIENT**; `/eta` never touches visits; visit `client_idempotency_key` |
| 3 | Completion / ticket close | Close checklist still waited on “approved”; ticket-gate blocked while SC open | Work-complete only; ticket close allowed when assignees/partners completed; **Close shared ticket only** API |
| 4 | Partner referral | Missing | Member checkbox → COMPLETE MY WORK + category + ticket Pending/HTO + **SUPPORT PARTNER REQUIRED** |
| 5 | Hardware | Buried / uneven fields | Member + HTO: description, qty, optional MAC, visit-linked |
| 6 | Finance send | Recipient/method/subject required | Download-gated **SENT TO FINANCE** + optional comment only |
| 7–8 | Workflow / refresh | Header-only refresh | Sticky refresh + last refresh time + toast; step shell retained |
| 9 | Sync/offline | Gaps on hardware/ETA | Outbox covers visits, contributions, eta, hardware |
| 10 | Errors | Generic strings | Descriptive API/UI messages across corrected paths |
| 11 | Finance PDF | Overlap / logo | Autotable + `TD_Logo_RGB_ThinkDigital_OnLight.png`; smoke script |

## Database

- `SUPPORT_CALLS_V4.sql` — reporter/houston, eta sent columns, partner_required, contribution/assignment referral fields, visit idempotency key.

## Key files

- Create/intake: `app/admin/support-calls/page.tsx`, `[id]/page.tsx`, `intake.ts`, create/submit APIs
- ETA/visits: `…/eta/route.ts`, `…/visits/route.ts`
- Completion/referral: `…/contributions/route.ts`, `SupportCallMemberPanel.tsx`, `ticket-gate.ts`, `…/close-ticket/route.ts`
- Finance: `…/finance/route.ts`
- Hardware: `…/hardware/route.ts`, `HardwareStockSection`
- PDF: `app/lib/support-calls/pdf.ts`, `public/TD_Logo_RGB_ThinkDigital_OnLight.png`

## Verification

- `yarn build` — passed
- Finance smoke: `npx tsx scripts/smoke-finance-pdf.ts` → `scripts/smoke-finance-handover.pdf` (visual check recommended before production)
- Manual acceptance against §13 still required in a live preview with V4 applied

## Limitations

- Hardware **photo** still uses the Documents upload path (link via `document_id` supported by API); dedicated camera UI on the stock row is not a separate component.
- Full §10 error rewrite across every historical SC string is incremental — corrected surfaces use descriptive messages; remaining older endpoints should be tightened as they are touched.
- Offline outbox is member-focused (visits / COMPLETE MY WORK / ETA / hardware), not the full HTO workspace.

## Deploy

1. Run `SUPPORT_CALLS_V3.sql` if not already applied.
2. Run `SUPPORT_CALLS_V4.sql`.
3. Deploy `preview-deployment` (or merge).
