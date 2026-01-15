-- If your user doesn't exist in auth.users, you need to create it
-- Option 1: Create via Supabase Dashboard (RECOMMENDED)
-- Go to: Authentication > Users > Add User > Create new user
-- Enter: coenie@td.dev and your password
-- Make sure "Auto Confirm User" is checked

-- Option 2: Create via SQL (only if you have superuser/admin access)
-- Note: This usually requires superuser privileges
-- Most users should use the Dashboard method above

-- First, check if user exists
SELECT id, email, email_confirmed_at 
FROM auth.users 
WHERE email = 'coenie@td.dev';

-- If the above returns NO ROWS, the user doesn't exist in auth.users
-- You MUST create it via the Dashboard (Option 1)
-- You cannot create auth.users via regular SQL in most Supabase setups

-- After creating the user in Dashboard, verify it exists:
SELECT id, email, email_confirmed_at, created_at
FROM auth.users 
WHERE email = 'coenie@td.dev';

-- Then make sure your profile matches:
UPDATE profiles 
SET 
  id = (SELECT id FROM auth.users WHERE email = 'coenie@td.dev'),
  is_admin = true,
  is_active = true
WHERE email = 'coenie@td.dev';







