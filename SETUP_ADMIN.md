# Setting Up Admin Access

## Steps to Access Admin Panel

### 1. Ensure Supabase is Configured

Make sure your `.env.local` file has valid Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. Grant Admin Access

**If you already have a profile** (recommended - no deletion needed):

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run this query (replace `coenie@td.dev` with your email):

```sql
-- First, check your existing profile
SELECT id, email, full_name, role, is_admin, is_active
FROM profiles 
WHERE email = 'coenie@td.dev';

-- Update it to make you an admin
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
```

**If you DON'T have a profile yet:**

#### Option A: Sign Up Through the App (if sign-ups are enabled)
1. Go to `http://localhost:3000/login`
2. Sign up with your email and password
3. Then run the UPDATE query above to set `is_admin = true`

#### Option B: Create Account Directly in Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **Authentication > Users**
3. Click **Add User** and create your account
4. Copy the User ID (UUID)

### 3. Create Your Admin Profile in the Database (Only if profile doesn't exist)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run this SQL query (replace `YOUR_USER_ID` and `YOUR_EMAIL`):

```sql
INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  is_admin,
  is_active
) VALUES (
  'YOUR_USER_ID',  -- The UUID from step 2
  'YOUR_EMAIL',    -- Your email address
  'Your Full Name',
  'Admin',
  true,            -- This makes you an admin
  true
);
```

### 4. Verify Admin Access

1. Log in at `http://localhost:3000/login` with your email and password
2. After login, you should see an "Admin Dashboard" link in the navigation
3. Click it to access `http://localhost:3000/admin`

### Troubleshooting

**If you still can't access admin:**
1. Check browser console for errors (F12)
2. Verify your profile in Supabase: 
   - Go to **Table Editor > profiles**
   - Find your user ID
   - Ensure `is_admin` column is `true`
3. Check that `NEXT_PUBLIC_SUPABASE_URL` in `.env.local` matches your Supabase project
4. Restart your dev server after changing `.env.local`

**Quick SQL Check:**
```sql
SELECT id, email, full_name, is_admin, is_active 
FROM profiles 
WHERE email = 'YOUR_EMAIL';
```

If `is_admin` shows `false` or `null`, update it:
```sql
UPDATE profiles 
SET is_admin = true 
WHERE email = 'YOUR_EMAIL';
```

