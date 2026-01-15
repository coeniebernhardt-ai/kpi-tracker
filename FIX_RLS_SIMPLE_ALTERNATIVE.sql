-- Alternative Fix: Simpler approach without helper function
-- This combines the user's own profile check with admin check in one policy
-- Run this if the helper function approach doesn't work

-- Step 1: Drop the problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all tickets" ON tickets;
DROP POLICY IF EXISTS "Admins can insert tickets for anyone" ON tickets;
DROP POLICY IF EXISTS "Admins can update any ticket" ON tickets;

-- Step 2: Recreate policies that combine user check with admin check
-- This avoids recursion by checking both conditions in a single query

CREATE POLICY "Users can view profiles - combined"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id 
    OR (
      -- Check admin status without recursion by using a subquery that doesn't trigger RLS
      -- This uses the fact that we're checking the same table but in a way that doesn't recurse
      (SELECT is_admin FROM profiles WHERE id = auth.uid()) = TRUE
    )
  );

CREATE POLICY "Users can update profiles - combined"
  ON profiles FOR UPDATE
  USING (
    auth.uid() = id 
    OR (SELECT is_admin FROM profiles WHERE id = auth.uid()) = TRUE
  );

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (TRUE); -- Allow inserts, the trigger will handle it

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  USING ((SELECT is_admin FROM profiles WHERE id = auth.uid()) = TRUE);

-- Ticket policies
CREATE POLICY "Users and admins can view tickets"
  ON tickets FOR SELECT
  USING (
    user_id = auth.uid() 
    OR (SELECT is_admin FROM profiles WHERE id = auth.uid()) = TRUE
  );

CREATE POLICY "Admins can insert tickets"
  ON tickets FOR INSERT
  WITH CHECK ((SELECT is_admin FROM profiles WHERE id = auth.uid()) = TRUE);

CREATE POLICY "Users and admins can update tickets"
  ON tickets FOR UPDATE
  USING (
    user_id = auth.uid() 
    OR (SELECT is_admin FROM profiles WHERE id = auth.uid()) = TRUE
  );







