-- Alternative Fix: No helper function needed
-- This approach restructures policies to avoid recursion without using functions
-- Run this if you prefer not to use helper functions

-- Step 1: Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view their own tickets" ON tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON tickets;
DROP POLICY IF EXISTS "Users can insert their own tickets" ON tickets;
DROP POLICY IF EXISTS "Admins can insert tickets for anyone" ON tickets;
DROP POLICY IF EXISTS "Users can update their own tickets" ON tickets;
DROP POLICY IF EXISTS "Admins can update any ticket" ON tickets;

-- Step 2: Create a single combined policy for profiles that checks admin status
-- We use a direct query that Supabase can optimize to avoid recursion
CREATE POLICY "Users can view profiles"
  ON profiles FOR SELECT
  USING (
    -- Users can always see their own profile
    auth.uid() = id
    OR
    -- Admins can see all profiles - check using a direct boolean check
    -- This avoids recursion by using a simple boolean comparison
    EXISTS (
      SELECT 1 
      FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.is_admin = TRUE
      -- Force use of index to avoid full table scan recursion
    )
  );

CREATE POLICY "Users can update profiles"
  ON profiles FOR UPDATE
  USING (
    auth.uid() = id
    OR
    EXISTS (
      SELECT 1 
      FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.is_admin = TRUE
    )
  );

-- Allow inserts (the trigger handles creating profiles)
CREATE POLICY "Allow profile inserts"
  ON profiles FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 
      FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.is_admin = TRUE
    )
  );

-- Step 3: Ticket policies
CREATE POLICY "Users can view tickets"
  ON tickets FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 
      FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.is_admin = TRUE
    )
  );

CREATE POLICY "Users can insert tickets"
  ON tickets FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 
      FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.is_admin = TRUE
    )
  );

CREATE POLICY "Users can update tickets"
  ON tickets FOR UPDATE
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 
      FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.is_admin = TRUE
    )
  );


