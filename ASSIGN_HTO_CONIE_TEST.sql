-- Create fictitious HTO test user (Auth + profile)
-- Email: coenie.bernhardt@gmail.com
-- Name:  Conie TEST
-- Password (temporary): ThinkQ-Hto-Test-2026!
--
-- Run in Supabase SQL Editor after SUPPORT_CALLS_SCHEMA.sql
-- Safe to re-run: updates existing user/profile if already present.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_hto BOOLEAN DEFAULT FALSE;

DO $$
DECLARE
  v_email TEXT := 'coenie.bernhardt@gmail.com';
  v_name TEXT := 'Conie TEST';
  v_password TEXT := 'ThinkQ-Hto-Test-2026!';
  v_user_id UUID;
  v_instance_id UUID;
BEGIN
  SELECT id INTO v_instance_id FROM auth.instances LIMIT 1;
  IF v_instance_id IS NULL THEN
    v_instance_id := '00000000-0000-0000-0000-000000000000';
  END IF;

  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(v_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      invited_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at,
      phone,
      phone_confirmed_at,
      email_change_token_current,
      email_change_confirm_status,
      banned_until,
      reauthentication_token,
      is_sso_user,
      deleted_at,
      is_anonymous
    ) VALUES (
      v_instance_id,
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_password, gen_salt('bf')),
      NOW(),
      NULL,
      '',
      '',
      '',
      '',
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object('full_name', v_name, 'role', 'Head Technical Officer'),
      FALSE,
      NOW(),
      NOW(),
      NULL,
      NULL,
      '',
      0,
      NULL,
      '',
      FALSE,
      NULL,
      FALSE
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object(
        'sub', v_user_id::text,
        'email', v_email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      v_user_id::text,
      NOW(),
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Created auth user % (%)', v_name, v_email;
  ELSE
    -- Refresh password + metadata for existing auth user
    UPDATE auth.users
    SET
      encrypted_password = crypt(v_password, gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
        || jsonb_build_object('full_name', v_name, 'role', 'Head Technical Officer'),
      updated_at = NOW()
    WHERE id = v_user_id;

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    SELECT
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object(
        'sub', v_user_id::text,
        'email', v_email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      v_user_id::text,
      NOW(),
      NOW(),
      NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM auth.identities i
      WHERE i.user_id = v_user_id AND i.provider = 'email'
    );

    RAISE NOTICE 'Updated existing auth user % (%)', v_name, v_email;
  END IF;

  INSERT INTO profiles (
    id,
    email,
    full_name,
    role,
    is_admin,
    is_hto,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    v_email,
    v_name,
    'Head Technical Officer',
    FALSE,
    TRUE,
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_hto = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  RAISE NOTICE 'HTO profile ready: % (%) id=%', v_name, v_email, v_user_id;
  RAISE NOTICE 'Sign in with password: ThinkQ-Hto-Test-2026!';
END $$;

SELECT id, email, full_name, role, is_admin, is_hto, is_active
FROM profiles
WHERE lower(email) = lower('coenie.bernhardt@gmail.com');
