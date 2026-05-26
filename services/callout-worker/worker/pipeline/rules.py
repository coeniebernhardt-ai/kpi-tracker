"""Deterministic flagging — no LLM."""
from .. import db


def _num(val: str | None) -> float | None:
    if not val:
        return None
    try:
        return float(str(val).replace(",", "").replace("R", "").strip())
    except ValueError:
        return None


def run_rules(record_id: str, document: dict, fields: dict, all_doc_fields: list[dict]):
    doc_id = document["id"]
    doc_type = document["doc_type"]

    hours = _num(fields.get("hours_worked"))
    labour = _num(fields.get("labour_charges"))
    travel = _num(fields.get("travel_charges"))

    if hours and hours > 16:
        db.insert_flag(
            record_id, doc_id, "abnormal_hours", "high",
            "Abnormal hours worked (>16h)",
            {"hours_worked": hours}, "RULE_ABNORMAL_HOURS",
        )

    if labour and hours and hours > 0:
        implied_rate = labour / hours
        if implied_rate > 2500:
            db.insert_flag(
                record_id, doc_id, "inconsistent_hourly_billing", "medium",
                "Implied hourly rate unusually high",
                {"implied_rate": implied_rate, "labour": labour, "hours": hours},
                "RULE_HOURLY_RATE",
            )

    if doc_type == "invoice":
        materials_inv = fields.get("materials_used") or ""
        if materials_inv and "travel" in materials_inv.lower():
            travel_count = sum(1 for f in all_doc_fields if (f.get("travel_charges") or "").strip())
            if travel_count > 1:
                db.insert_flag(
                    record_id, doc_id, "duplicate_travel_charges", "medium",
                    "Possible duplicate travel charges",
                    {}, "RULE_DUP_TRAVEL",
                )

        if not fields.get("referenced_job_card_number"):
            db.insert_flag(
                record_id, doc_id, "missing_job_card_reference", "high",
                "Invoice missing job card reference",
                {}, "RULE_MISSING_JC_REF",
            )

    if doc_type == "job_card" and fields.get("signature_present", "").lower() == "false":
        db.insert_flag(
            record_id, doc_id, "missing_signature", "medium",
            "Job card signature not detected",
            {}, "RULE_MISSING_SIGNATURE",
        )

    if not (fields.get("work_description") or "").strip():
        db.insert_flag(
            record_id, doc_id, "incomplete_work_description", "low",
            "Work description missing or empty",
            {}, "RULE_INCOMPLETE_DESC",
        )

    if doc_type == "invoice" and not fields.get("vat_number"):
        db.insert_flag(
            record_id, doc_id, "missing_vat_number", "medium",
            "VAT registration number not found",
            {}, "RULE_MISSING_VAT",
        )

    if not fields.get("po_number"):
        db.insert_flag(
            record_id, doc_id, "missing_po_number", "low",
            "PO number not found",
            {}, "RULE_MISSING_PO",
        )

    total = _num(fields.get("total"))
    if total and total > 50000:
        db.insert_flag(
            record_id, doc_id, "suspicious_pricing", "medium",
            "Invoice total exceeds threshold",
            {"total": total}, "RULE_HIGH_TOTAL",
        )


def score_compliance(record_id: str, document: dict, fields: dict, scan_quality: float) -> int:
    score = 100
    breakdown = {}

    if fields.get("signature_present", "").lower() == "false" and document["doc_type"] == "job_card":
        score -= 15
        breakdown["missing_signature"] = -15

    if scan_quality < 0.5:
        score -= 20
        breakdown["poor_scan_quality"] = -20
    elif scan_quality < 0.7:
        score -= 10
        breakdown["moderate_scan_quality"] = -10

    if not fields.get("vat_number") and document["doc_type"] == "invoice":
        score -= 10
        breakdown["missing_vat_number"] = -10

    if not (fields.get("work_description") or "").strip():
        score -= 10
        breakdown["incomplete_work_description"] = -10

    if not fields.get("po_number"):
        score -= 5
        breakdown["missing_po_number"] = -5

    score = max(0, min(100, score))
    db.update_record_compliance(record_id, score, breakdown)
    return score
