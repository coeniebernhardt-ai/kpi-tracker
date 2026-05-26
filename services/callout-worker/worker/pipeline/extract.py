import re
from typing import Any

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None


def normalize_ref(value: str | None) -> str | None:
    if not value:
        return None
    n = value.strip().upper().replace(" ", "")
    return n or None


def extract_text_from_pdf(pdf_bytes: bytes) -> tuple[str, int, float]:
    if not fitz:
        return "", 0, 0.0
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages = []
    confidences = []
    for page in doc:
        text = page.get_text() or ""
        pages.append(text)
        confidences.append(0.85 if len(text.strip()) > 50 else 0.45)
    doc.close()
    full = "\n\n".join(pages)
    avg = sum(confidences) / len(confidences) if confidences else 0.0
    return full, len(pages), avg


def apply_regex_fields(text: str, config: dict) -> dict[str, Any]:
    regex_map = config.get("regex") or {}
    fields: dict[str, Any] = {}
    for key, pattern in regex_map.items():
        if not pattern:
            continue
        m = re.search(pattern, text, re.MULTILINE | re.IGNORECASE)
        if m:
            fields[key] = (m.group(1) if m.lastindex else m.group(0)).strip()
    return fields


def extract_document(pdf_bytes: bytes, template: dict | None, doc_type: str) -> dict[str, Any]:
    ocr_text, page_count, confidence = extract_text_from_pdf(pdf_bytes)
    config = (template or {}).get("config_json") or {}
    if isinstance(config, str):
        import json
        config = json.loads(config)

    fields = apply_regex_fields(ocr_text, config)

    prefix = config.get("job_card_prefix")
    if prefix and doc_type == "job_card" and not fields.get("job_card_number"):
        m = re.search(rf"({re.escape(prefix)}[A-Z0-9\-/]+)", ocr_text, re.I)
        if m:
            fields["job_card_number"] = m.group(1)

    signature_present = "signature" in ocr_text.lower() or bool(
        re.search(r"(signed|signature)", ocr_text, re.I)
    )
    if doc_type == "job_card":
        fields.setdefault("signature_present", "true" if signature_present else "false")

    return {
        "fields": fields,
        "ocr_text": ocr_text,
        "page_count": page_count,
        "ocr_confidence_avg": confidence,
        "template_key": config.get("template_key", "generic_v1"),
    }
