-- Add DELETE policy for tickets table
-- Run this in Supabase SQL Editor
-- This allows admins to delete tickets

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "Admins can delete tickets" ON tickets;
DROP POLICY IF EXISTS "Users can delete their own tickets" ON tickets;

-- Allow admins to delete any ticket
CREATE POLICY "Admins can delete tickets"
  ON tickets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 
      FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.is_admin = TRUE
    )
  );

-- Optionally: Allow users to delete their own tickets (uncomment if needed)
-- CREATE POLICY "Users can delete their own tickets"
--   ON tickets FOR DELETE
--   USING (user_id = auth.uid());

-- Verify the policy was created
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE tablename = 'tickets' AND cmd = 'DELETE';
