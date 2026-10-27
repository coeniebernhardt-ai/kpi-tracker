# Service Calls — delivery report

## 1. What changed

Replaced the Callouts **UI product surface** with a new **Service Calls** operational module. OCR `callout_*` tables/data are **not** dropped.

**Added**
- `SERVICE_CALLS_SCHEMA.sql` — tables, RLS, notification type extension
- `CREATE_SERVICE_CALL_DOCUMENTS_BUCKET.sql` — private storage bucket
- `app/lib/service-calls/*` — types, transitions, auth, audit, job-card validation, ticket close gate, notify, client
- `app/api/service-calls/**` — list/create, detail/patch, assign, accept, visits, job-card submit/review, link/unlink ticket, by-ticket, metrics, search-tickets, audit, comments, documents
- `app/admin/service-calls/**`, `app/dashboard/service-calls/**`
- Shared UI: `ServiceCallsApp`, `ServiceCallDetail`, `TicketServiceCallsPanel`
- Admin nav **Service Calls**; member header link; ticket panels; admin dashboard metrics strip
- `closeTicket()` blocks when linked service calls are incomplete

## 2. Admin vs Member

| | Admin | Member |
|--|--------|--------|
| List scope | All org calls | Created / reported / coordinator / assigned |
| Lifecycle | Full | Full (same actions on accessible calls) |
| Nav | `/admin/service-calls` | `/dashboard/service-calls` |
| Dashboard metrics | Yes | N/A (use module queues) |

## 3. Ticket relationship

- **A** Create from ticket panel (prefills client/site/issue/priority)
- **B** Standalone create from Service Calls module
- **C** Link/unlink via search on detail page
- Multiple service calls per ticket allowed; IDs stay independent

## 4. Migrations / RLS

Run in Supabase SQL Editor **in order**:
1. `SERVICE_CALLS_SCHEMA.sql`
2. `CREATE_SERVICE_CALL_DOCUMENTS_BUCKET.sql`

RLS: admins full access; members scoped to created_by / reported_by / coordinator_id / assigned_technician_id.

**Note:** Schema extends `notifications.type` and allows null `ticket_id`. If your live CHECK constraint name differs, adjust the DROP CONSTRAINT block.

## 5. Ticket view + dashboard

- Admin tickets expanded detail + member open-ticket detail show **Service Calls** panel
- Admin home shows live SC metrics from `/api/service-calls/metrics`

## 6. Workflow / statuses / permissions

- Separate `technical_status` and `invoicing_status` with server-side transition maps
- Job card must pass checklist before accept → `ready_to_invoice` (both statuses)
- Return visits append visits; same `service_call_number`
- **HTO**: soft label `coordinator_role_label` (default `"HTO"`); not a new auth role
- Ticket close requires every linked SC to be `closed` (with accepted job card) or `cancelled`

## 7. Checks run

| Command | Result |
|---------|--------|
| `yarn run build` | **Passed** (Next.js 16.0.7) |
| Automated Jest/Vitest | **None in repo** — not run |
| Live Supabase / E2E browser | **Not run** here — requires your SQL apply + preview deploy |

## 8. Assumptions / limitations

- Members may run the full operational + invoicing **tracking** flow on calls they can access
- Not an accounting system (invoice numbers/amounts/status only)
- First-visit / return-visit rates on metrics return `null` until richer visit analytics are added
- OCR Callouts UI not restored; `callout_*` preserved if already in DB

## 9. Deploy steps

1. Run the two SQL scripts in Supabase  
2. Deploy app (e.g. push `preview-deployment`)  
3. Hard-refresh; open **Service Calls** as admin and member  
4. Create a call, link a ticket, confirm ticket close is blocked until the call is closed with an accepted job card  
