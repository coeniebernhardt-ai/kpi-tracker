-- Link a Supabase Auth user to public.profiles using the correct UUID (no copy/paste mistakes).
-- Run in Supabase SQL Editor after the user exists under Authentication → Users.

-- 1) Diagnose: Auth user vs profile
SELECT
  u.id AS auth_user_id,
  u.email AS auth_email,
  p.id AS profile_id,
  p.full_name,
  p.role,
  p.is_admin
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email ILIKE 'tanya@td.dev';

-- 2) If profile_id is NULL, upsert profile from auth (replace email filter if needed)
INSERT INTO public.profiles (id, email, full_name, role, is_admin, is_active, avatar)
SELECT
  u.id,
  u.email::text,
  'Tanya de Villiers',
  'Head Of Project Management',
  true,
  true,
  'TV'
FROM auth.users u
WHERE u.email ILIKE 'tanya@td.dev'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_admin = EXCLUDED.is_admin,
  is_active = EXCLUDED.is_active,
  avatar = COALESCE(public.profiles.avatar, EXCLUDED.avatar),
  updated_at = NOW();

-- 3) Verify again
SELECT id, email, full_name, role, is_admin, is_active
FROM public.profiles
WHERE email ILIKE 'tanya@td.dev';
