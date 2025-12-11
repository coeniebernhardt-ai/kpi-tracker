-- Run this SQL migration to add support for multiple assigned members
-- Copy and paste this entire script into Supabase SQL Editor

-- Step 1: Add the assigned_to_array column (UUID array)
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS assigned_to_array UUID[] DEFAULT '{}';

-- Step 2: Migrate existing single assignments to array format (if any exist)
-- This converts the old assigned_to (single UUID) to assigned_to_array
UPDATE tickets 
SET assigned_to_array = ARRAY[assigned_to]::UUID[]
WHERE assigned_to IS NOT NULL 
  AND (assigned_to_array IS NULL OR assigned_to_array = '{}');

-- Step 3: Create GIN index for efficient array queries
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to_array 
ON tickets USING GIN (assigned_to_array);

-- Step 4: Verify the column was created
SELECT column_name, data_type, udt_name
FROM information_schema.columns 
WHERE table_name = 'tickets' AND column_name = 'assigned_to_array';

