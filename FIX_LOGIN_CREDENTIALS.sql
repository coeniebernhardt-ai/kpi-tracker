-- Step 1: Check if your user exists in auth.users (Supabase Authentication)
-- Run this in Supabase SQL Editor
SELECT id, email, created_at, email_confirmed_at, last_sign_in_at
FROM auth.users 
WHERE email = 'coenie@td.dev';

-- If the above query returns NO RESULTS, your user doesn't exist in auth.users
-- You need to create it in the Supabase Dashboard (see instructions below)

-- Step 2: Check your profile
SELECT id, email, full_name, role, is_admin, is_active
FROM profiles 
WHERE email = 'coenie@td.dev';

-- Step 3: If user exists in auth.users but password is wrong, 
-- you need to reset it via Supabase Dashboard > Authentication > Users
-- OR use the password reset function in the app







