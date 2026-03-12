-- ============================================
-- Pending queue: track which team members have "viewed" pending tickets (for badge count)
-- Run in Supabase SQL Editor. Required for dashboard "Pending (N)" unviewed count.
-- ============================================

CREATE TABLE IF NOT EXISTS ticket_pending_views (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, ticket_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_pending_views_user ON ticket_pending_views(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_pending_views_ticket ON ticket_pending_views(ticket_id);

ALTER TABLE ticket_pending_views ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert/select their own view records
DROP POLICY IF EXISTS "Users manage own pending views" ON ticket_pending_views;
CREATE POLICY "Users manage own pending views" ON ticket_pending_views
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
