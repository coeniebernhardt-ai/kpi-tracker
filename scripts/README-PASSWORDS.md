# Password Creation Script

This script creates secure passwords for all members in your Supabase database.

## Setup

1. Create a `.env` file in the root directory (if it doesn't exist) with:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**OR** use your existing environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` (will be used if `SUPABASE_URL` is not set)
- `SUPABASE_SERVICE_ROLE_KEY` (required)

## How to get your Service Role Key

1. Go to your Supabase Dashboard
2. Navigate to **Settings** → **API**
3. Copy the **service_role** key (NOT the anon key - this is important!)
4. Add it to your `.env` file

⚠️ **WARNING**: The service role key has admin privileges. Never commit it to git or expose it publicly.

## Running the Script

```bash
node scripts/create-all-passwords.js
```

## What it does

1. Fetches all profiles from the `profiles` table
2. For each profile, generates a secure password based on their name:
   - Format: `[Initials]2024[Random4Digits]!`
   - Example: `CB20247823!` for "Coenie Bernhardt"
3. Updates the password in Supabase Auth for each user
4. Displays a complete list of all passwords

## Output

The script will display:
- ✅ Successfully updated passwords
- ❌ Failed updates (with reasons)
- 📊 Summary statistics
- 🔑 Complete password list for all members

## Password Format

Passwords follow this pattern:
- **Initials**: First letter of first name + first letter of last name
- **Year**: 2024
- **Random**: 4-digit random number (1000-9999)
- **Special**: Exclamation mark (!)

Example: `CB20247823!` for "Coenie Bernhardt"
