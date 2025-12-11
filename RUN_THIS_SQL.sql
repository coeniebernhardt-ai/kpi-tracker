-- Add assigned_to column to tickets table
-- Run this entire file in Supabase SQL Editor

-- Step 1: Add the assigned_to column if it doesn't exist
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Step 2: Create index for faster queries on assigned tickets
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);

-- Step 3: Add comment to document the column
COMMENT ON COLUMN tickets.assigned_to IS 'ID of the team member assigned to work on this ticket';

-- Step 4: Verify the column was created (this will show the result)
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tickets' AND column_name = 'assigned_to';

