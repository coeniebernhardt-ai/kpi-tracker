-- Quick Fix: Temporarily allow users to read their own admin status
-- This is a workaround that should work immediately

-- Step 1: Drop problematic policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Step 2: Create a single policy that allows users to view their own profile
-- and also allows reading the is_admin field from their own profile
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Step 3: Create a separate policy for admins that uses a different approach
-- We'll use a function with SECURITY DEFINER in public schema
CREATE OR REPLACE FUNCTION public.check_admin_status(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT is_admin FROM profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Step 4: Recreate admin policies using the function
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (public.check_admin_status(auth.uid()) = TRUE);

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (
    auth.uid() = id OR public.check_admin_status(auth.uid()) = TRUE
  );

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  USING (public.check_admin_status(auth.uid()) = TRUE);

-- Step 5: Fix ticket policies
DROP POLICY IF EXISTS "Users can view their own tickets" ON tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON tickets;

CREATE POLICY "Users can view tickets"
  ON tickets FOR SELECT
  USING (
    user_id = auth.uid() OR public.check_admin_status(auth.uid()) = TRUE
  );

DROP POLICY IF EXISTS "Admins can update any ticket" ON tickets;
CREATE POLICY "Admins can update any ticket"
  ON tickets FOR UPDATE
  USING (
    user_id = auth.uid() OR public.check_admin_status(auth.uid()) = TRUE
  );


