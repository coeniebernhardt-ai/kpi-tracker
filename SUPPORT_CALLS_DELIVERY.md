# Support Calls — delivery report

## 1. Old experimental functionality removed
- Deleted `app/admin/service-calls`, `app/dashboard/service-calls`, `app/api/service-calls`, `app/lib/service-calls`, `app/components/service-calls`
- Removed Service Calls nav, admin metrics strip, create-with-ticket checkbox, ticket panels
- Removed callout migrations / SQL docs and `services/callout-worker`
- Provided `SUPPORT_CALLS_DROP_LEGACY.sql` to drop live DB objects and buckets

## 2. New architecture
- HTO-owned Support Call ↔ one Think-Q ticket (unique FK)
- Multi technician assignments + lead flag; partners without logins
- Guided HTO/Admin UI under `/admin/support-calls`
- Member Technical Work panel inside ticket expand
- Public signing at `/sign/[token]`

## 3. Database
- `SUPPORT_CALLS_SCHEMA.sql` (+ supabase migration mirror)
- Tables: support_calls, assignments, partners, communications, eta_events, visits, hardware, contributions, quotes, documents, job_cards, signing_tokens, signatures, signature_exceptions, finance_handovers, audit_events, duplicate_decisions
- `profiles.is_hto`
- Private bucket `support-call-documents`
- RLS via `is_support_call_manager()` / assignee helpers

## 4–5. Roles
- `is_hto` separate from Admin; AuthContext `isHto` / `canManageSupportCalls`
- AdminShell allows HTO on Support Calls + Reports only
- Manage Users: Admin can toggle HTO (`/api/admin/toggle-hto`)
- Login: Admin → `/admin`, HTO → `/admin/support-calls`, member → `/dashboard`

## 6–7. Member + ticket integration
- `SupportCallMemberPanel`: Start Work (Pending→Open once), ETA, visits, contribution submit
- `SupportCallConvertPanel` on admin tickets
- Create SC creates Pending ticket assigned to HTO (server-side insert)
- `closeTicket` blocked while linked Support Call is open (`ticket-gate`)

## 8–13. Partners, visits, quotes, signing, finance
- Partner directory + once-off snapshots
- Quotes with atomic first-wins decide
- Job card generation (jspdf), signing tokens (hashed, 7-day), signature exception
- Finance handover generate / download / Sent to Finance
- Close/cancel with ticket action choice

## 14. Reports
- Register Excel/CSV: `/api/support-calls/reports/register`
- Documents ZIP: `/api/support-calls/reports/[id]/zip`
- Panel on `/admin/reports` for Admin/HTO

## 15. Audit
- Append-only `support_call_audit_events`; managers read-only in UI/API

## 16. Tests executed
- `yarn build` / TypeScript compile of new routes (see Stage 10)
- Full acceptance 1–80 against live Supabase requires: run DROP_LEGACY + SCHEMA, designate HTO, then smoke checklist in `SUPPORT_CALLS_SMOKE.md`

## 17. Outstanding / limitations
- PDF layouts are functional text/table branded exports (logo `/logo-team.png` when present); not a full desktop publishing template
- ZIP requires documents uploaded to `support-call-documents` bucket
- Notifications CHECK must include new `support_call_*` types (included in DROP_LEGACY rewrite)
- End-to-end browser smoke against production data not run in this session

## Deploy
1. Run `SUPPORT_CALLS_DROP_LEGACY.sql`
2. Run `SUPPORT_CALLS_SCHEMA.sql`
3. Designate HTO users in Manage Users
4. Deploy app to Vercel when ready
