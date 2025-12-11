-- Fix RLS policies to allow all authenticated users to view profiles
-- This is needed so users can see all team members when assigning tickets
-- Run this in your Supabase SQL Editor

-- Step 1: Add a policy to allow all authenticated users to view all profiles
-- (This is safe because profiles only contain basic info, not sensitive data)
CREATE POLICY "All authenticated users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Step 2: Verify the policy was created
-- You can check with: SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Note: If you get an error saying the policy already exists, you may need to drop the old restrictive policy first:
-- DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

-- However, it's safer to keep both policies - the more permissive one will take precedence
-- If both exist, users can view all profiles (which is what we want for assignment)

