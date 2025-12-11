-- Complete migration script for travel_logs table
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- This will add all missing columns safely

-- Add start_address column (if it doesn't exist)
ALTER TABLE travel_logs 
ADD COLUMN IF NOT EXISTS start_address TEXT;

-- Add end_address column (if it doesn't exist)
ALTER TABLE travel_logs 
ADD COLUMN IF NOT EXISTS end_address TEXT;

-- Add is_return_trip column (if it doesn't exist)
ALTER TABLE travel_logs 
ADD COLUMN IF NOT EXISTS is_return_trip BOOLEAN DEFAULT FALSE;

-- Add distance_travelled column (if it doesn't exist)
ALTER TABLE travel_logs 
ADD COLUMN IF NOT EXISTS distance_travelled NUMERIC(10, 2);

-- Add attachments column (if it doesn't exist)
ALTER TABLE travel_logs 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Add comments to columns
COMMENT ON COLUMN travel_logs.start_address IS 'Starting address/location of the trip';
COMMENT ON COLUMN travel_logs.end_address IS 'Ending address/destination of the trip';
COMMENT ON COLUMN travel_logs.is_return_trip IS 'Whether this is a return trip (doubles the distance)';
COMMENT ON COLUMN travel_logs.distance_travelled IS 'Distance travelled in kilometers';
COMMENT ON COLUMN travel_logs.attachments IS 'Array of attachment objects with url, name, and type';

-- Note: The 'destination' column is kept for backwards compatibility with existing data
-- New records will use start_address and end_address instead

