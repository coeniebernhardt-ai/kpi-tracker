-- Step 1: First, check if you already have a user in auth.users
-- Go to Supabase Dashboard > Authentication > Users and create a user first
-- Then copy the User ID (UUID) from there

-- Step 2: Replace 'YOUR_USER_ID_HERE' with the actual UUID from step 1
-- Replace 'your-email@example.com' with your email
-- Replace 'Your Full Name' with your name

-- Check if profile already exists
SELECT id, email, full_name, is_admin, is_active 
FROM profiles 
WHERE email = 'your-email@example.com';

-- If profile doesn't exist, create it:
INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  is_admin,
  is_active
) VALUES (
  'YOUR_USER_ID_HERE',  -- Paste the UUID from Supabase Authentication > Users
  'your-email@example.com',  -- Your email (must match the one in auth.users)
  'Your Full Name',  -- Your full name
  'Admin',  -- Role
  true,  -- is_admin = true (this makes you an admin)
  true   -- is_active = true
)
ON CONFLICT (id) DO UPDATE
SET 
  is_admin = true,
  is_active = true,
  updated_at = NOW();

-- If profile exists but is_admin is false, just update it:
-- UPDATE profiles 
-- SET is_admin = true, is_active = true, updated_at = NOW()
-- WHERE email = 'your-email@example.com';

-- Verify it worked:
SELECT id, email, full_name, role, is_admin, is_active, created_at
FROM profiles 
WHERE email = 'your-email@example.com';


