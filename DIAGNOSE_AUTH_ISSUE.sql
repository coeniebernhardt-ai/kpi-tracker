-- Diagnose authentication issues
-- Run this to check the user's status

-- Check user details in auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  confirmed_at,
  created_at,
  last_sign_in_at,
  raw_user_meta_data,
  CASE 
    WHEN email_confirmed_at IS NULL THEN 'Email NOT confirmed'
    ELSE 'Email confirmed'
  END as confirmation_status
FROM auth.users 
WHERE email = 'coenie@td.dev';

-- Check profile details
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

-- Check if IDs match (they MUST match!)
SELECT 
  'auth.users ID' as source,
  id::text as user_id
FROM auth.users 
WHERE email = 'coenie@td.dev'
UNION ALL
SELECT 
  'profiles ID' as source,
  id::text as user_id
FROM profiles 
WHERE email = 'coenie@td.dev';







