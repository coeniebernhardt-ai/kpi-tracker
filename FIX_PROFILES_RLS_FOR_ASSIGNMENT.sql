-- Fix RLS policies to allow all authenticated users to view profiles
-- This is needed so users can see all team members when assigning tickets
-- Run this in your Supabase SQL Editor

-- Step 1: Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "All authenticated users can view all profiles" ON profiles;

-- Step 2: Add a policy to allow all authenticated users to view all profiles
-- (This is safe because profiles only contain basic info, not sensitive data)
CREATE POLICY "All authenticated users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Step 3: Verify the policy was created
-- You can check with: SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Note: PostgreSQL uses OR logic for multiple policies,
-- so if ANY policy allows access, the user can access the row.
-- This means the new policy will work alongside existing ones.

