-- Update travel_logs table to add distance_travelled and attachments
-- Run this in your Supabase SQL Editor if you already created the table

-- Add distance_travelled column (in kilometers)
ALTER TABLE travel_logs 
ADD COLUMN IF NOT EXISTS distance_travelled NUMERIC(10, 2);

-- Add attachments column (JSON array of file URLs)
ALTER TABLE travel_logs 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Add comment
COMMENT ON COLUMN travel_logs.distance_travelled IS 'Distance travelled in kilometers';
COMMENT ON COLUMN travel_logs.attachments IS 'Array of attachment objects with url, name, and type';

