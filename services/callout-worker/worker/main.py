import json
import time
import traceback

from . import db
from .config import EXTRACTOR_VERSION, POLL_INTERVAL_SEC
from .pipeline import ai_enrich, extract, match, rules
from .storage import download_pdf

JOB_CHAIN = {
    "preprocess": "ocr_extract",
    "ocr_extract": "match_and_flag",
    "match_and_flag": "ai_enrich",
    "ai_enrich": "reindex_search",
    "reindex_search": None,
}


def persist_fields(document_id: str, extraction_id: str, fields: dict):
    for key, val in fields.items():
        if val is None:
            continue
        text = str(val) if not isinstance(val, (dict, list)) else None
        numeric = None
        value_json = None
        if isinstance(val, (dict, list)):
            value_json = val
        else:
            try:
                cleaned = str(val).replace(",", "").replace("R", "").strip()
                if cleaned.replace(".", "").isdigit():
                    numeric = float(cleaned)
            except Exception:
                pass
        db.upsert_field_value(document_id, key, text, numeric, value_json, extraction_id)


def handle_preprocess(job: dict, document: dict):
    db.update_document_status(document["id"], "ocr")
    return JOB_CHAIN["preprocess"]


def handle_ocr_extract(job: dict, document: dict):
    pdf_bytes = download_pdf(document["storage_path"])
    template = db.fetch_template(document["contractor_id"], document["doc_type"])
    tpl_version = template["version"] if template else None
    result = extract.extract_document(pdf_bytes, template, document["doc_type"])
    extraction_id = db.insert_extraction(
        document["id"],
        tpl_version,
        result,
        result["ocr_text"],
        result["ocr_confidence_avg"],
    )
    persist_fields(document["id"], extraction_id, result["fields"])
    db.update_document_status(
        document["id"],
        "extracted",
        result["ocr_confidence_avg"],
        result["page_count"],
    )
    db.audit("document", document["id"], "extraction.completed", {
        "extraction_id": extraction_id,
        "extractor_version": EXTRACTOR_VERSION,
    })
    return JOB_CHAIN["ocr_extract"]


def handle_match_and_flag(job: dict, document: dict):
    fields = db.get_field_map(document["id"])
    if document["doc_type"] == "invoice":
        match.try_exact_link(document, fields)
    else:
        record_id = match.attach_orphan_job_card(document, fields)
        db.insert_flag(
            record_id,
            document["id"],
            "missing_invoice",
            "low",
            "Job card awaiting matching invoice",
            {},
            "RULE_MISSING_INVOICE",
        )

    document = db.fetch_document(document["id"]) or document
    record_id = document.get("callout_record_id")
    if not record_id:
        record_id = db.ensure_callout_record(document["contractor_id"], fields.get("job_card_number"))

    all_fields = [db.get_field_map(document["id"])]
    rules.run_rules(record_id, document, fields, all_fields)
    scan = float(document.get("scan_quality_score") or 0.75)
    rules.score_compliance(record_id, document, fields, scan)

    with db.get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) FROM callout_flags WHERE callout_record_id = %s AND status = 'open'",
                (record_id,),
            )
            open_flags = cur.fetchone()[0]
            status = "needs_review" if open_flags > 0 else "processing"
            cur.execute(
                "UPDATE callout_records SET status = %s, updated_at = NOW() WHERE id = %s",
                (status, record_id),
            )

    return JOB_CHAIN["match_and_flag"]


def handle_ai_enrich(job: dict, document: dict):
    document = db.fetch_document(document["id"]) or document
    record_id = document.get("callout_record_id")
    if not record_id:
        return JOB_CHAIN["ai_enrich"]

    fields = db.get_field_map(document["id"])
    with db.get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT ocr_text FROM callout_extractions WHERE document_id = %s ORDER BY extracted_at DESC LIMIT 1",
                (document["id"],),
            )
            row = cur.fetchone()
            ocr_text = row[0] if row else ""

    context = {"fields": fields, "ocr_excerpt": (ocr_text or "")[:4000], "doc_type": document["doc_type"]}
    ai_enrich.enrich_record(record_id, context)
    chunks = [ocr_text[i : i + 1500] for i in range(0, min(len(ocr_text), 6000), 1400)]
    ai_enrich.create_embeddings(record_id, chunks)
    db.update_document_status(document["id"], "enriched")
    return JOB_CHAIN["ai_enrich"]


def handle_reindex_search(job: dict, document: dict):
    return JOB_CHAIN["reindex_search"]


HANDLERS = {
    "preprocess": handle_preprocess,
    "ocr_extract": handle_ocr_extract,
    "match_and_flag": handle_match_and_flag,
    "ai_enrich": handle_ai_enrich,
    "reindex_search": handle_reindex_search,
}


def process_job(job: dict):
    document = db.fetch_document(job["document_id"])
    if not document:
        raise RuntimeError(f"Document not found: {job['document_id']}")

    handler = HANDLERS.get(job["job_type"])
    if not handler:
        raise RuntimeError(f"Unknown job type: {job['job_type']}")

    next_type = handler(job, document)
    db.complete_job(job["id"], next_type, document["id"])


def main_loop():
    print(f"Callout worker started (poll={POLL_INTERVAL_SEC}s)")
    while True:
        job = db.claim_next_job()
        if not job:
            time.sleep(POLL_INTERVAL_SEC)
            continue
        try:
            process_job(job)
            print(f"Completed job {job['id']} ({job['job_type']})")
        except Exception as e:
            traceback.print_exc()
            db.fail_job(
                job["id"],
                str(e),
                job["attempts"],
                job["max_attempts"],
                job["document_id"],
            )
            print(f"Failed job {job['id']}: {e}")


if __name__ == "__main__":
    main_loop()
