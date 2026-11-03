# Support Calls smoke checklist

Prereq: run `SUPPORT_CALLS_DROP_LEGACY.sql` then `SUPPORT_CALLS_SCHEMA.sql`. Set at least one `is_hto` user.

1. HTO creates Support Call → Pending ticket assigned to HTO
2. Convert existing ticket → same ticket id; SC linked
3. Assign two techs + lead → each gets notification; ticket assignees updated
4. Technician Start Work → ticket Pending→Open once
5. Log visit with arrival/departure → minutes + excess + R5.80 travel
6. Submit contribution → HTO return → resubmit → approve
7. Add partner once-off + quote → approve/reject (reject needs reason)
8. Generate job card → signing link → client signs on `/sign/...`
9. Regen expired link invalidates old token
10. Signature Not Obtained exception works
11. Finance generate → download → Sent to Finance (manual)
12. Close gated until finance sent; Cancel asks ticket close/leave
13. Reports: register xlsx/csv; documents zip
14. Member cannot create SC; cannot close SC
15. Unrelated tickets still work
