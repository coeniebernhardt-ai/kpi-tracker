-- Test if we can query the user directly
-- This helps verify the user exists and is accessible

SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  encrypted_password IS NOT NULL as has_password
FROM auth.users 
WHERE email = 'coenie@td.dev';

-- Note: You cannot see the actual password hash for security reasons
-- But if has_password is TRUE, the user has a password set


