-- Check if your user exists in Supabase Authentication
-- Run this in Supabase SQL Editor

-- Check auth.users table
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at,
  confirmed_at,
  raw_user_meta_data
FROM auth.users 
WHERE email = 'coenie@td.dev';

-- Check if profile exists
SELECT 
  id,
  email,
  full_name,
  role,
  is_admin,
  is_active,
  created_at
FROM profiles 
WHERE email = 'coenie@td.dev';

-- Compare the IDs - they should match!
SELECT 
  'auth.users ID' as source,
  id
FROM auth.users 
WHERE email = 'coenie@td.dev'
UNION ALL
SELECT 
  'profiles ID' as source,
  id::text
FROM profiles 
WHERE email = 'coenie@td.dev';







