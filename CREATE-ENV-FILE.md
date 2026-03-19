# Create .env File - Quick Instructions

## Step 1: Create the .env file

Create a file named `.env` in the root directory (`c:\Users\coenie\kpi-tracker\.env`) with the following content:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## Step 2: Get Your Supabase Credentials

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Settings** → **API**
4. Copy:
   - **Project URL** → Replace `https://your-project-id.supabase.co`
   - **service_role** key (scroll down, it's separate from the anon key) → Replace `your-service-role-key-here`

⚠️ **IMPORTANT**: Use the **service_role** key, NOT the **anon** key!

## Step 3: Run the Password Creation Script

Once your `.env` file is created with the correct values, run:

```bash
node scripts/create-all-passwords.js
```

## What Happens Next

The script will:
1. ✅ Fetch all profiles from your database
2. ✅ Generate secure passwords (format: `[Initials]2024[Random]!`)
3. ✅ Update passwords in Supabase Auth
4. ✅ Display a complete password list for all members

## Example .env File

```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjQwMDAwMDAwLCJleHAiOjE5NTU1NzYwMDB9.example
```

## Security Note

The `.env` file is automatically ignored by git (via `.gitignore`). Never commit it to version control.
