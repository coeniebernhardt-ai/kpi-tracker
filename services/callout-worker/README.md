# Contractor Callout Intelligence — Document Worker

Python worker that polls `callout_processing_jobs` with `FOR UPDATE SKIP LOCKED` and runs the OCR/extraction/matching/AI pipeline.

## Environment

```env
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-xx.pooler.supabase.com:6543/postgres
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...          # optional, for ai_enrich + embeddings
ENABLE_CALLOUT_AI=true
WORKER_ID=callout-worker-1
POLL_INTERVAL_SEC=3
```

## Run locally

```bash
cd services/callout-worker
pip install -r requirements.txt
python -m worker.main
```

## Docker

```bash
docker build -t thinkq-callout-worker .
docker run --env-file .env thinkq-callout-worker
```

## Job chain

`preprocess` → `ocr_extract` → `match_and_flag` → `ai_enrich` → `reindex_search`
