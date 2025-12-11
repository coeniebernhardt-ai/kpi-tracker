-- Fix RLS policies to allow assigned members to update and view tickets
-- Run this in your Supabase SQL Editor

-- Step 1: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Assigned members can view assigned tickets" ON tickets;
DROP POLICY IF EXISTS "Assigned members can update assigned tickets" ON tickets;

-- Step 2: Allow assigned members to view tickets they're assigned to
CREATE POLICY "Assigned members can view assigned tickets"
  ON tickets FOR SELECT
  TO authenticated
  USING (
    -- User is the ticket owner
    user_id = auth.uid()
    OR
    -- User is assigned to the ticket (check if their ID is in the assigned_to_array)
    auth.uid() = ANY(assigned_to_array)
    OR
    -- User is an admin
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Step 3: Allow assigned members to update tickets they're assigned to
CREATE POLICY "Assigned members can update assigned tickets"
  ON tickets FOR UPDATE
  TO authenticated
  USING (
    -- User is the ticket owner
    user_id = auth.uid()
    OR
    -- User is assigned to the ticket (check if their ID is in the assigned_to_array)
    auth.uid() = ANY(assigned_to_array)
    OR
    -- User is an admin
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Note: PostgreSQL uses OR logic for multiple policies,
-- so if ANY policy allows access, the user can access the row.
-- This means the new policies will work alongside existing ones.

