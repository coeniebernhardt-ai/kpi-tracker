-- Check if assigned_to column exists and verify RLS policies
-- Run this in your Supabase SQL Editor to diagnose issues

-- 1. Check if the column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tickets' AND column_name = 'assigned_to';

-- 2. If column doesn't exist, add it
-- ALTER TABLE tickets 
-- ADD COLUMN assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 3. Check RLS policies for tickets table
SELECT * FROM pg_policies WHERE tablename = 'tickets';

-- 4. If needed, add/update RLS policy to allow updates to assigned_to
-- Users should be able to update assigned_to if they own the ticket or are admin
-- This is usually already covered by existing UPDATE policies, but verify

-- 5. Verify the foreign key constraint
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'tickets'
  AND kcu.column_name = 'assigned_to';






