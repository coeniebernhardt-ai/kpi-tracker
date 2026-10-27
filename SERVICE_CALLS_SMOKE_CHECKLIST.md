# Service Calls — smoke checklist

Run `SERVICE_CALLS_QUOTES_AND_DEDUPE.sql` in Supabase before testing quotes/dedupe.

## Member
- [ ] Create service call → auto-assigned to self; name shows in detail (not bare HTO)
- [ ] Next Action: New → Start triage / Remote / Needs site visit (no admin wait)
- [ ] Accept only when awaiting acceptance (assignee)
- [ ] Log visit → submit job card → accept job card → Ready to invoice
- [ ] Cannot assign/reassign; cannot change invoicing status
- [ ] Create-with-ticket checkbox → alert shows ticket # + SC # → opens SC
- [ ] Expand open ticket → Create / Create Another Service Call works
- [ ] Duplicate external ref on create → safe hint only; override with reason notifies admins

## Admin
- [ ] Assign / reassign from admin strip; audit has previous + new assignee
- [ ] Override technical/invoicing with mandatory reason → audited + notified
- [ ] Pending quote: Approve / Reject (reason on reject); concurrent decide → 409 toast + refresh
- [ ] Metrics strip: pending quotes + duplicate overrides (0 / — when empty)
- [ ] Duplicate check response includes matching SC numbers

## Concurrent quote
- [ ] Two browsers Approve same pending quote → one 200, one 409
