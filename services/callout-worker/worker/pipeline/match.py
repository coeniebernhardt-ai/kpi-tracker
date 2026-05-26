from .. import db
from .extract import normalize_ref


def try_exact_link(document: dict, fields: dict) -> bool:
    """Auto-link ONLY on exact normalized job card reference."""
    if document["doc_type"] != "invoice":
        return False
    ref = fields.get("referenced_job_card_number")
    norm = normalize_ref(ref)
    if not norm:
        record_id = document.get("callout_record_id")
        if not record_id:
            record_id = db.ensure_callout_record(document["contractor_id"], None)
            db.update_document_status(document["id"], "extracted")
            db.insert_flag(
                record_id,
                document["id"],
                "missing_job_card_reference",
                "high",
                "Missing job card reference on invoice",
                {"referenced_job_card_number": ref},
                "RULE_MISSING_JC_REF",
            )
        return False

    job_card_doc_id = db.find_job_card_document(document["contractor_id"], norm)
    if not job_card_doc_id:
        return False

    jc_fields = db.get_field_map(job_card_doc_id)
    jc_num = jc_fields.get("job_card_number")
    record_id = document.get("callout_record_id")
    if not record_id:
        record_id = db.ensure_callout_record(document["contractor_id"], jc_num)

    db.link_documents(
        record_id,
        job_card_doc_id,
        document["id"],
        "auto_exact_ref",
        {"referenced_job_card_number": ref, "normalized": norm},
    )
    db.audit("document", document["id"], "link.created", {
        "link_type": "auto_exact_ref",
        "job_card_document_id": job_card_doc_id,
        "callout_record_id": record_id,
    })
    return True


def attach_orphan_job_card(document: dict, fields: dict) -> str:
    jc = fields.get("job_card_number")
    record_id = document.get("callout_record_id")
    if not record_id:
        record_id = db.ensure_callout_record(document["contractor_id"], jc)
        db.update_document_status(document["id"], "extracted")
        with db.get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE callout_documents SET callout_record_id = %s WHERE id = %s",
                    (record_id, document["id"]),
                )
                cur.execute(
                    "UPDATE callout_records SET primary_job_card_number = COALESCE(primary_job_card_number, %s), updated_at = NOW() WHERE id = %s",
                    (jc, record_id),
                )
    return record_id
