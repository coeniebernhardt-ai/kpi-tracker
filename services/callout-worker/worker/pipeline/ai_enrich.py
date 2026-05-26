import json
from .. import db
from ..config import ENABLE_AI, OPENAI_API_KEY


def enrich_record(record_id: str, context: dict):
    if not ENABLE_AI or not OPENAI_API_KEY:
        db.update_record_ai(
            record_id,
            "AI enrichment disabled or API key missing.",
            [],
        )
        return

    try:
        from openai import OpenAI
        client = OpenAI(api_key=OPENAI_API_KEY)
        prompt = (
            "You analyze contractor job cards and invoices for operational intelligence. "
            "Return JSON only: {\"summary\": string, \"fault_classifications\": string[]}. "
            "Ground strictly in provided data; do not invent amounts.\n\n"
            f"Data:\n{json.dumps(context, default=str)[:12000]}"
        )
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Respond with valid JSON only."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
        )
        text = resp.choices[0].message.content or "{}"
        parsed = json.loads(text.strip().removeprefix("```json").removesuffix("```").strip())
        summary = parsed.get("summary", "")
        classes = parsed.get("fault_classifications") or []
        db.update_record_ai(record_id, summary, classes)
        with db.get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO callout_ai_enrichments (target_type, target_id, model, prompt_version, output_json)
                    VALUES ('record', %s, 'gpt-4o-mini', '1.0.0', %s::jsonb)
                    """,
                    (record_id, json.dumps(parsed)),
                )
        db.audit("record", record_id, "ai.enrichment_completed", {"model": "gpt-4o-mini"})
    except Exception as e:
        db.update_record_ai(record_id, f"AI enrichment failed: {e}", [])


def create_embeddings(record_id: str, texts: list[str]):
    if not ENABLE_AI or not OPENAI_API_KEY or not texts:
        return
    try:
        from openai import OpenAI
        client = OpenAI(api_key=OPENAI_API_KEY)
        for i, chunk in enumerate(texts[:20]):
            if len(chunk.strip()) < 20:
                continue
            emb = client.embeddings.create(
                model="text-embedding-3-small",
                input=chunk[:8000],
            )
            vec = emb.data[0].embedding
            with db.get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO callout_search_chunks (callout_record_id, chunk_index, chunk_text, embedding, metadata_json)
                        VALUES (%s, %s, %s, %s::vector, '{}'::jsonb)
                        """,
                        (record_id, i, chunk[:5000], vec),
                    )
                    if i == 0:
                        cur.execute(
                            "UPDATE callout_records SET embedding = %s::vector, updated_at = NOW() WHERE id = %s",
                            (vec, record_id),
                        )
    except Exception:
        pass


def suggest_similar_links(document_id: str, contractor_id: str, embedding: list[float] | None):
    """AI suggestions only — never auto-link."""
    if not embedding:
        return
    try:
        with db.get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, 1 - (embedding <=> %s::vector) AS similarity
                    FROM callout_records
                    WHERE contractor_id = %s AND embedding IS NOT NULL
                    ORDER BY embedding <=> %s::vector
                    LIMIT 3
                    """,
                    (embedding, contractor_id, embedding),
                )
                for row in cur.fetchall():
                    rec_id, sim = row[0], float(row[1])
                    if sim < 0.82:
                        continue
                    cur.execute(
                        """
                        INSERT INTO callout_link_suggestions
                          (document_id, suggested_callout_record_id, confidence, reason_json)
                        VALUES (%s, %s, %s, %s::jsonb)
                        ON CONFLICT DO NOTHING
                        """,
                        (
                            document_id,
                            rec_id,
                            sim,
                            json.dumps({"type": "embedding_similarity", "similarity": sim}),
                        ),
                    )
    except Exception:
        pass
