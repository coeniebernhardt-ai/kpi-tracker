-- Fix destination column constraint issue
-- Run this in your Supabase SQL Editor

-- Option 1: Make destination column nullable (recommended)
ALTER TABLE travel_logs 
ALTER COLUMN destination DROP NOT NULL;

-- Option 2: Or set a default value instead
-- ALTER TABLE travel_logs 
-- ALTER COLUMN destination SET DEFAULT 'Not specified';

-- After running this, the destination column will accept NULL values
-- The code will still provide a value, but this prevents constraint violations

