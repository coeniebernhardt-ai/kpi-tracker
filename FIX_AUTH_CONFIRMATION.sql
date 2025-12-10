-- Fix email confirmation if needed
-- If email_confirmed_at is NULL, the user needs to be confirmed

-- Option 1: Manually confirm the user via SQL (if you have permission)
-- Replace 'USER_ID_HERE' with the actual UUID from auth.users
UPDATE auth.users
SET 
  email_confirmed_at = NOW(),
  confirmed_at = NOW()
WHERE email = 'coenie@td.dev';

-- Verify it worked
SELECT 
  email,
  email_confirmed_at,
  confirmed_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN 'Confirmed ✓'
    ELSE 'NOT Confirmed ✗'
  END as status
FROM auth.users 
WHERE email = 'coenie@td.dev';

-- Option 2: If you can't update auth.users directly, use the Dashboard:
-- Go to: Authentication > Users > Find your user > Click the three dots > 
-- Select "Confirm Email" or "Confirm User"


