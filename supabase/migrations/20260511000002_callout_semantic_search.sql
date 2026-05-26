-- Semantic search RPC for callout records
CREATE OR REPLACE FUNCTION search_callout_records_semantic(
  query_embedding vector(1536),
  match_count INT DEFAULT 20,
  contractor_filter UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  contractor_id UUID,
  status TEXT,
  primary_job_card_number TEXT,
  primary_site_name TEXT,
  service_date DATE,
  compliance_score INT,
  ai_summary TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.contractor_id,
    r.status,
    r.primary_job_card_number,
    r.primary_site_name,
    r.service_date,
    r.compliance_score,
    r.ai_summary,
    (1 - (r.embedding <=> query_embedding))::FLOAT AS similarity
  FROM callout_records r
  WHERE r.embedding IS NOT NULL
    AND (contractor_filter IS NULL OR r.contractor_id = contractor_filter)
  ORDER BY r.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql STABLE;
