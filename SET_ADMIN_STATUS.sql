-- Set your admin status to true
-- Replace 'coenie@td.dev' with your actual email if different

-- First, check your current status
SELECT id, email, full_name, role, is_admin, is_active
FROM profiles 
WHERE email = 'coenie@td.dev';

-- Update to make yourself admin
UPDATE profiles 
SET 
  is_admin = true,
  is_active = true,
  updated_at = NOW()
WHERE email = 'coenie@td.dev';

-- Verify it worked
SELECT id, email, full_name, role, is_admin, is_active
FROM profiles 
WHERE email = 'coenie@td.dev';

-- Now test the function again
SELECT public.is_admin() AS is_admin_check;
-- This should now return TRUE


