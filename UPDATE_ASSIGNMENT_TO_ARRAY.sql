-- Update assigned_to column to support multiple members (array)
-- Run this in your Supabase SQL Editor

-- Step 1: Create a new column for array of assigned user IDs
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS assigned_to_array UUID[] DEFAULT '{}';

-- Step 2: Migrate existing single assignments to array (if any exist)
UPDATE tickets 
SET assigned_to_array = ARRAY[assigned_to]::UUID[]
WHERE assigned_to IS NOT NULL AND (assigned_to_array IS NULL OR assigned_to_array = '{}');

-- Step 3: Drop the old single assigned_to column (optional - comment out if you want to keep both temporarily)
-- ALTER TABLE tickets DROP COLUMN IF EXISTS assigned_to;

-- Step 4: Rename the new column to assigned_to (if you dropped the old one)
-- ALTER TABLE tickets RENAME COLUMN assigned_to_array TO assigned_to;

-- Step 5: Create index for array operations
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to_array ON tickets USING GIN (assigned_to_array);

-- Step 6: Update the old column to be an array type instead (alternative approach - keeps column name)
-- First, let's check current state
-- If you want to keep the name 'assigned_to', you'll need to:
-- 1. Rename old column: ALTER TABLE tickets RENAME COLUMN assigned_to TO assigned_to_old;
-- 2. Create new array column: ALTER TABLE tickets ADD COLUMN assigned_to UUID[];
-- 3. Migrate data: UPDATE tickets SET assigned_to = ARRAY[assigned_to_old]::UUID[] WHERE assigned_to_old IS NOT NULL;
-- 4. Drop old column: ALTER TABLE tickets DROP COLUMN assigned_to_old;

-- For now, we'll use assigned_to_array and update the code to use it
-- Later you can rename it back to assigned_to once confirmed working

