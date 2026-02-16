-- ============================================
-- ADMIN GLOBAL KPI FUNCTION (Think-Q)
-- Run once in Supabase SQL Editor.
-- Returns one row: total, open, closed, avg response times.
-- ============================================

CREATE OR REPLACE FUNCTION get_ticket_kpis()
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total_tickets', COUNT(*)::int,
    'open_tickets', COUNT(*) FILTER (WHERE status = 'open')::int,
    'closed_tickets', COUNT(*) FILTER (WHERE status = 'closed')::int,
    'avg_response_time_minutes', ROUND(AVG(response_time_minutes) FILTER (WHERE status = 'closed' AND response_time_minutes IS NOT NULL AND response_time_minutes > 0))::int,
    'avg_no_deps', ROUND(AVG(response_time_minutes) FILTER (
      WHERE status = 'closed' AND response_time_minutes IS NOT NULL AND response_time_minutes > 0
        AND NOT (has_dependencies = true AND COALESCE(TRIM(dependency_name), '') != '')
    ))::int,
    'avg_with_deps', ROUND(AVG(response_time_minutes) FILTER (
      WHERE status = 'closed' AND response_time_minutes IS NOT NULL AND response_time_minutes > 0
        AND has_dependencies = true AND COALESCE(TRIM(dependency_name), '') != ''
    ))::int
  )
  FROM tickets;
$$;

-- Grant execute to authenticated users (RLS still applies to tickets table)
GRANT EXECUTE ON FUNCTION get_ticket_kpis() TO authenticated;
GRANT EXECUTE ON FUNCTION get_ticket_kpis() TO service_role;
