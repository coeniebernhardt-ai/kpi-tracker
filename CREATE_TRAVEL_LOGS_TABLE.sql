-- Create travel_logs table for tracking user travel
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

CREATE TABLE IF NOT EXISTS travel_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  destination TEXT NOT NULL,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_travel_logs_user_id ON travel_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_travel_logs_created_at ON travel_logs(created_at DESC);

-- Enable RLS
ALTER TABLE travel_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own travel logs
CREATE POLICY "Users can view their own travel logs"
  ON travel_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own travel logs
CREATE POLICY "Users can insert their own travel logs"
  ON travel_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own travel logs
CREATE POLICY "Users can delete their own travel logs"
  ON travel_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all travel logs
CREATE POLICY "Admins can view all travel logs"
  ON travel_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Add comment
COMMENT ON TABLE travel_logs IS 'Travel logs for tracking user travel with reason, destination, and comments';

