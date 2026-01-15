-- Fix Infinite Recursion in RLS Policies
-- Run this in Supabase SQL Editor to fix the "infinite recursion detected" error

-- Step 1: Drop the problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all tickets" ON tickets;
DROP POLICY IF EXISTS "Admins can insert tickets for anyone" ON tickets;
DROP POLICY IF EXISTS "Admins can update any ticket" ON tickets;

-- Step 2: Create a helper function that bypasses RLS to check admin status
-- This function uses SECURITY DEFINER to bypass RLS checks
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = auth.uid() 
    AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Step 3: Recreate the policies using the helper function (no recursion!)
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id OR auth.is_admin()
  );

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (
    auth.uid() = id OR auth.is_admin()
  );

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    auth.uid() = id OR auth.is_admin()
  );

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  USING (auth.is_admin());

-- Step 4: Fix ticket policies too
CREATE POLICY "Admins can view all tickets"
  ON tickets FOR SELECT
  USING (
    user_id = auth.uid() OR auth.is_admin()
  );

CREATE POLICY "Admins can insert tickets for anyone"
  ON tickets FOR INSERT
  WITH CHECK (auth.is_admin());

CREATE POLICY "Admins can update any ticket"
  ON tickets FOR UPDATE
  USING (
    user_id = auth.uid() OR auth.is_admin()
  );

-- Step 5: Verify the fix worked
-- This should now work without recursion
SELECT auth.is_admin() AS is_admin_check;







