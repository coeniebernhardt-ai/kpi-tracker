-- ============================================
-- THINK-Q TICKET PERFORMANCE OPTIMIZATION
-- Scalable to 100k+ tickets
-- ============================================

-- 1️⃣ Composite index for active tickets (status + created_at)
CREATE INDEX IF NOT EXISTS idx_tickets_status_created_desc
ON tickets (status, created_at DESC);

-- 2️⃣ Primary cursor pagination index
CREATE INDEX IF NOT EXISTS idx_tickets_created_desc
ON tickets (created_at DESC);

-- 3️⃣ Assigned user index (admin filtering)
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_created_desc
ON tickets (assigned_to, created_at DESC);

-- 4️⃣ Date range filtering optimization
CREATE INDEX IF NOT EXISTS idx_tickets_created_range
ON tickets (created_at);

-- ============================================
-- FUNCTION: Fetch Latest 30 Tickets
-- ============================================

CREATE OR REPLACE FUNCTION get_latest_tickets()
RETURNS SETOF tickets AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM tickets
  ORDER BY created_at DESC
  LIMIT 30;
END;
$$ LANGUAGE plpgsql STABLE;


-- ============================================
-- FUNCTION: Cursor-Based Pagination
-- Fetch next 30 where created_at < last_seen
-- ============================================

CREATE OR REPLACE FUNCTION get_next_tickets(last_seen TIMESTAMP)
RETURNS SETOF tickets AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM tickets
  WHERE created_at < last_seen
  ORDER BY created_at DESC
  LIMIT 30;
END;
$$ LANGUAGE plpgsql STABLE;


-- ============================================
-- FUNCTION: Fetch Active Tickets Only
-- ============================================

CREATE OR REPLACE FUNCTION get_active_tickets()
RETURNS SETOF tickets AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM tickets
  WHERE status IN ('open', 'in_progress')
  ORDER BY created_at DESC
  LIMIT 30;
END;
$$ LANGUAGE plpgsql STABLE;


-- ============================================
-- FUNCTION: Date Range Filter (Still Paginated)
-- ============================================

CREATE OR REPLACE FUNCTION get_tickets_by_date_range(
  start_date TIMESTAMP,
  end_date TIMESTAMP
)
RETURNS SETOF tickets AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM tickets
  WHERE created_at BETWEEN start_date AND end_date
  ORDER BY created_at DESC
  LIMIT 30;
END;
$$ LANGUAGE plpgsql STABLE;


-- ============================================
-- OPTIONAL: Date Range + Cursor Combined
-- For deep archive browsing
-- ============================================

CREATE OR REPLACE FUNCTION get_next_tickets_by_date_range(
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  last_seen TIMESTAMP
)
RETURNS SETOF tickets AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM tickets
  WHERE created_at BETWEEN start_date AND end_date
    AND created_at < last_seen
  ORDER BY created_at DESC
  LIMIT 30;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- END
-- ============================================
