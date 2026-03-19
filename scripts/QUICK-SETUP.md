# Quick Setup Guide - Create Passwords for All Members

## Option 1: Automated Setup (Recommended)

Run the PowerShell setup script:

```powershell
.\scripts\setup-env.ps1
```

This will prompt you for:
- Your Supabase URL
- Your Supabase Service Role Key

Then run:
```bash
node scripts/create-all-passwords.js
```

## Option 2: Manual Setup

1. **Create a `.env` file** in the root directory with:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

2. **Get your credentials from Supabase Dashboard:**
   - Go to: https://supabase.com/dashboard
   - Select your project
   - Go to **Settings** → **API**
   - Copy:
     - **Project URL** → Use for `SUPABASE_URL`
     - **service_role** key (NOT the anon key!) → Use for `SUPABASE_SERVICE_ROLE_KEY`

3. **Run the script:**
   ```bash
   node scripts/create-all-passwords.js
   ```

## What the Script Does

1. ✅ Fetches all profiles from your database
2. ✅ Generates secure passwords for each member
3. ✅ Updates passwords in Supabase Auth
4. ✅ Displays complete password list

## Password Format

- Format: `[Initials]2024[Random4Digits]!`
- Example: `CB20247823!` for "Coenie Bernhardt"

## Security Note

⚠️ The `.env` file contains sensitive credentials and is automatically ignored by git (via `.gitignore`). Never commit it to version control.
