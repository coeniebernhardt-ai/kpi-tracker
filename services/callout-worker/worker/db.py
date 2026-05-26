import json
import uuid
from contextlib import contextmanager
from typing import Any

import psycopg2
from psycopg2.extras import RealDictCursor

from .config import DATABASE_URL, WORKER_ID


@contextmanager
def get_conn():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL or SUPABASE_DB_URL required")
    conn = psycopg2.connect(DATABASE_URL)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def claim_next_job() -> dict[str, Any] | None:
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE callout_processing_jobs
                SET status = 'running',
                    locked_at = NOW(),
                    locked_by = %s,
                    attempts = attempts + 1
                WHERE id = (
                  SELECT id FROM callout_processing_jobs
                  WHERE status = 'pending'
                    AND scheduled_at <= NOW()
                    AND attempts < max_attempts
                  ORDER BY priority DESC, scheduled_at ASC
                  FOR UPDATE SKIP LOCKED
                  LIMIT 1
                )
                RETURNING *
                """,
                (WORKER_ID,),
            )
            row = cur.fetchone()
            return dict(row) if row else None


def complete_job(job_id: str, next_job_type: str | None = None, document_id: str | None = None):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE callout_processing_jobs
                SET status = 'completed', completed_at = NOW(), locked_at = NULL, locked_by = NULL
                WHERE id = %s
                """,
                (job_id,),
            )
            if next_job_type and document_id:
                cur.execute(
                    """
                    INSERT INTO callout_processing_jobs (document_id, job_type, status, priority)
                    VALUES (%s, %s, 'pending', 5)
                    """,
                    (document_id, next_job_type),
                )


def fail_job(job_id: str, error: str, attempts: int, max_attempts: int, document_id: str):
    with get_conn() as conn:
        with conn.cursor() as cur:
            status = "dead_letter" if attempts >= max_attempts else "pending"
            cur.execute(
                """
                UPDATE callout_processing_jobs
                SET status = %s,
                    error = %s,
                    locked_at = NULL,
                    locked_by = NULL,
                    scheduled_at = NOW() + INTERVAL '1 minute' * POWER(2, LEAST(attempts, 5))
                WHERE id = %s
                """,
                (status, error[:2000], job_id),
            )
            if status == "dead_letter":
                cur.execute(
                    "UPDATE callout_documents SET processing_status = 'failed' WHERE id = %s",
                    (document_id,),
                )


def fetch_document(document_id: str) -> dict[str, Any] | None:
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM callout_documents WHERE id = %s", (document_id,))
            row = cur.fetchone()
            return dict(row) if row else None


def fetch_template(contractor_id: str, doc_type: str) -> dict[str, Any] | None:
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT * FROM contractor_extraction_templates
                WHERE contractor_id = %s AND doc_type = %s AND is_active = TRUE
                ORDER BY created_at DESC LIMIT 1
                """,
                (contractor_id, doc_type),
            )
            row = cur.fetchone()
            return dict(row) if row else None


def insert_extraction(document_id: str, template_version: str | None, raw: dict, ocr_text: str, confidence: float):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO callout_extractions
                  (document_id, template_version, extractor_version, raw_json, ocr_text, ocr_confidence_avg)
                VALUES (%s, %s, %s, %s::jsonb, %s, %s)
                RETURNING id
                """,
                (
                    document_id,
                    template_version,
                    "1.0.0",
                    json.dumps(raw),
                    ocr_text,
                    confidence,
                ),
            )
            return cur.fetchone()[0]


def upsert_field_value(
    document_id: str,
    field_key: str,
    value_text: str | None,
    value_numeric: float | None,
    value_json: Any,
    extraction_id: str,
):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO callout_field_values
                  (document_id, field_key, value_text, value_numeric, value_json, source, last_extraction_id)
                VALUES (%s, %s, %s, %s, %s::jsonb, 'extraction', %s)
                ON CONFLICT (document_id, field_key) WHERE document_id IS NOT NULL
                DO UPDATE SET
                  value_text = EXCLUDED.value_text,
                  value_numeric = EXCLUDED.value_numeric,
                  value_json = EXCLUDED.value_json,
                  last_extraction_id = EXCLUDED.last_extraction_id,
                  source = CASE
                    WHEN callout_field_values.source = 'manual' THEN callout_field_values.source
                    ELSE 'extraction'
                  END,
                  updated_at = NOW()
                """,
                (
                    document_id,
                    field_key,
                    value_text,
                    value_numeric,
                    json.dumps(value_json) if value_json is not None else None,
                    extraction_id,
                ),
            )


def audit(entity_type: str, entity_id: str, action: str, payload: dict):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO callout_audit_log (entity_type, entity_id, action, payload_json)
                VALUES (%s, %s, %s, %s::jsonb)
                """,
                (entity_type, entity_id, action, json.dumps(payload)),
            )


def get_field_map(document_id: str) -> dict[str, str]:
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT field_key, value_text FROM callout_field_values WHERE document_id = %s",
                (document_id,),
            )
            return {r["field_key"]: r["value_text"] or "" for r in cur.fetchall()}


def find_job_card_document(contractor_id: str, normalized_ref: str) -> str | None:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT d.id FROM callout_documents d
                JOIN callout_field_values fv ON fv.document_id = d.id
                WHERE d.contractor_id = %s AND d.doc_type = 'job_card'
                  AND fv.field_key = 'job_card_number'
                  AND UPPER(REPLACE(TRIM(fv.value_text), ' ', '')) = %s
                LIMIT 1
                """,
                (contractor_id, normalized_ref),
            )
            row = cur.fetchone()
            return str(row[0]) if row else None


def ensure_callout_record(contractor_id: str, job_card_number: str | None) -> str:
    with get_conn() as conn:
        with conn.cursor() as cur:
            if job_card_number:
                cur.execute(
                    """
                    SELECT id FROM callout_records
                    WHERE contractor_id = %s AND primary_job_card_number = %s
                    LIMIT 1
                    """,
                    (contractor_id, job_card_number),
                )
                row = cur.fetchone()
                if row:
                    return str(row[0])
            record_id = str(uuid.uuid4())
            cur.execute(
                """
                INSERT INTO callout_records (id, contractor_id, status, primary_job_card_number)
                VALUES (%s, %s, 'processing', %s)
                """,
                (record_id, contractor_id, job_card_number),
            )
            return record_id


def link_documents(
    record_id: str,
    job_card_id: str,
    invoice_id: str,
    link_type: str,
    evidence: dict,
):
    with get_conn() as conn:
        with conn.cursor() as cur:
            for doc_id in (job_card_id, invoice_id):
                cur.execute(
                    "UPDATE callout_documents SET callout_record_id = %s, processing_status = 'extracted' WHERE id = %s",
                    (record_id, doc_id),
                )
            cur.execute(
                """
                INSERT INTO callout_document_links
                  (callout_record_id, job_card_document_id, invoice_document_id, link_type, link_evidence)
                VALUES (%s, %s, %s, %s, %s::jsonb)
                ON CONFLICT (invoice_document_id) DO NOTHING
                """,
                (record_id, job_card_id, invoice_id, link_type, json.dumps(evidence)),
            )


def insert_flag(record_id: str, document_id: str | None, flag_type: str, severity: str, title: str, detail: dict, rule_id: str):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO callout_flags
                  (callout_record_id, document_id, flag_type, severity, title, detail_json, rule_id)
                VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s)
                """,
                (record_id, document_id, flag_type, severity, title, json.dumps(detail), rule_id),
            )


def update_record_compliance(record_id: str, score: int, breakdown: dict):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE callout_records
                SET compliance_score = %s, compliance_breakdown_json = %s::jsonb,
                    status = CASE WHEN %s < 60 THEN 'needs_review' ELSE status END,
                    updated_at = NOW()
                WHERE id = %s
                """,
                (score, json.dumps(breakdown), score, record_id),
            )


def update_record_ai(record_id: str, summary: str, classifications: list[str]):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE callout_records
                SET ai_summary = %s, fault_classification = %s, updated_at = NOW()
                WHERE id = %s
                """,
                (summary, classifications, record_id),
            )


def update_document_status(document_id: str, status: str, scan_quality: float | None = None, page_count: int | None = None):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE callout_documents
                SET processing_status = %s,
                    scan_quality_score = COALESCE(%s, scan_quality_score),
                    page_count = COALESCE(%s, page_count)
                WHERE id = %s
                """,
                (status, scan_quality, page_count, document_id),
            )
