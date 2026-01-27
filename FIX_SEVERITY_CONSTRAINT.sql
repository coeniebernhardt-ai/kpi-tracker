-- Fix severity constraint to match code (use URGENT instead of CRITICAL)
-- Run this in Supabase SQL Editor

-- Step 1: Drop the existing constraint
ALTER TABLE tickets 
DROP CONSTRAINT IF EXISTS tickets_severity_check;

-- Step 2: Add the correct constraint with URGENT
ALTER TABLE tickets 
ADD CONSTRAINT tickets_severity_check 
CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT'));

-- Step 3: Update any existing CRITICAL values to URGENT (if any exist)
UPDATE tickets 
SET severity = 'URGENT' 
WHERE severity = 'CRITICAL';

-- Step 4: Verify the constraint
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'tickets'::regclass
  AND conname = 'tickets_severity_check';
