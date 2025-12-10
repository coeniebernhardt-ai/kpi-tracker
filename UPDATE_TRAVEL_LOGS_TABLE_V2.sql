-- Update travel_logs table to add start_address, end_address, and is_return_trip
-- Run this in your Supabase SQL Editor

-- Add start_address and end_address columns
ALTER TABLE travel_logs 
ADD COLUMN IF NOT EXISTS start_address TEXT;

ALTER TABLE travel_logs 
ADD COLUMN IF NOT EXISTS end_address TEXT;

-- Add is_return_trip column
ALTER TABLE travel_logs 
ADD COLUMN IF NOT EXISTS is_return_trip BOOLEAN DEFAULT FALSE;

-- Add comments
COMMENT ON COLUMN travel_logs.start_address IS 'Starting address/location of the trip';
COMMENT ON COLUMN travel_logs.end_address IS 'Ending address/destination of the trip';
COMMENT ON COLUMN travel_logs.is_return_trip IS 'Whether this is a return trip (doubles the distance)';

