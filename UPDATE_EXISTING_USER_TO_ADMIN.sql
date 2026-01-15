-- Step 1: Find your existing profile
-- Replace 'coenie@td.dev' with your actual email
SELECT id, email, full_name, role, is_admin, is_active, created_at
FROM profiles 
WHERE email = 'coenie@td.dev';

-- Step 2: If the profile exists, update it to make you an admin
-- This will update your existing profile without needing to delete anything
UPDATE profiles 
SET 
  is_admin = true,
  is_active = true,
  role = COALESCE(role, 'Admin'),  -- Only update if role is null
  updated_at = NOW()
WHERE email = 'coenie@td.dev';

-- Step 3: Verify the update worked
SELECT id, email, full_name, role, is_admin, is_active, updated_at
FROM profiles 
WHERE email = 'coenie@td.dev';

-- If you need to check if your user exists in auth.users:
-- (Run this in SQL Editor - it will show your auth user if it exists)
SELECT id, email, created_at, email_confirmed_at
FROM auth.users 
WHERE email = 'coenie@td.dev';







