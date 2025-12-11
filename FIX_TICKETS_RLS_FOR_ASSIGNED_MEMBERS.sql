-- Fix RLS policies to allow assigned members to update and view tickets
-- Run this in your Supabase SQL Editor

-- Step 1: Allow assigned members to view tickets they're assigned to
-- (This should already be working via getTicketsByUserId, but let's ensure it's explicit)
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

-- Step 2: Allow assigned members to update tickets they're assigned to
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

-- Note: If you get errors about duplicate policies, you may need to drop the old restrictive ones first:
-- DROP POLICY IF EXISTS "Users can view their own tickets" ON tickets;
-- DROP POLICY IF EXISTS "Users can update their own tickets" ON tickets;

-- However, having multiple policies is fine - PostgreSQL will use OR logic,
-- so if ANY policy allows access, the user can access the row.

