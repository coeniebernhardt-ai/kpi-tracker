# Contractor Callout Intelligence

Think Q module for processing contractor Job Card and Invoice PDFs.

## Setup

1. **Supabase SQL** — Run in order:
   - `supabase/migrations/20260511000000_callout_intelligence.sql`
   - `supabase/migrations/20260511000001_callout_seed_templates.sql`
   - `supabase/migrations/20260511000002_callout_semantic_search.sql`
   - Or `CREATE_CALLOUT_DOCUMENTS_BUCKET.sql` if bucket alone is needed

2. **Environment** (`.env.local` + worker):
   - Existing Supabase keys
   - `OPENAI_API_KEY` — optional, for AI enrichment and semantic search
   - Worker: `DATABASE_URL` (Supabase pooler connection string)

3. **Python worker**:
   ```bash
   cd services/callout-worker
   pip install -r requirements.txt
   python -m worker.main
   ```
   Or `docker build -t thinkq-callout-worker . && docker run --env-file .env`

4. **Admin UI**: `/admin/callouts` (admin users only)

## Architecture

- **Next.js** — upload, review, search, analytics APIs under `/api/callouts/*`
- **Postgres queue** — `callout_processing_jobs` with `SKIP LOCKED`
- **Python worker** — OCR/extract, exact-match linking, rules, optional OpenAI enrichment
- **Private storage** — bucket `callout-documents`, signed PDF URLs only

## Matching policy

Auto-link **only** when `invoice.referenced_job_card_number` exactly matches `job_card.job_card_number` (normalized). All other matches are suggestions for manual review.

## Email ingestion (optional)

Set `ENABLE_CALLOUT_EMAIL_INGEST=true` and configure mailbox env vars documented in `app/lib/callouts/email-ingest.ts`. Cron or external poller can POST to `/api/callouts/email-ingest`.
