# Setting Up Environment Variables in Vercel

## Required Environment Variables for Ticket Deletion

The admin ticket deletion feature requires the `SUPABASE_SERVICE_ROLE_KEY` to be set in Vercel.

## Step-by-Step Instructions

### 1. Get Your Service Role Key from Supabase

1. Go to: https://supabase.com/dashboard
2. Select your project (the one with URL: `https://csbliwkldlglbniqmdin.supabase.co`)
3. Navigate to **Settings** → **API**
4. Scroll down to find the **service_role** key section
5. Click the **eye icon** to reveal the key (or click "Reveal")
6. **Copy the entire key** (it's a long JWT token starting with `eyJ...`)

⚠️ **IMPORTANT**: 
- Use the **service_role** key, NOT the **anon** key
- The service_role key has admin privileges - keep it secret
- Never commit this key to git

### 2. Add Environment Variable to Vercel

1. Go to: https://vercel.com/dashboard
2. Select your project: **kpi-tracker**
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Add the following:

   **For Production:**
   - **Key**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: (paste your service_role key from step 1)
   - **Environment**: Select **Production**, **Preview**, and **Development**
   - Click **Save**

6. **Redeploy** your application:
   - Go to **Deployments** tab
   - Click the **three dots** (⋯) on the latest deployment
   - Click **Redeploy**

### 3. AI Insights (optional, off by default)

AI Insights is **disabled by default**. To enable it:

1. In Vercel: **Settings** → **Environment Variables** → **Add New**
2. **Key**: `ENABLE_AI_INSIGHTS`  
   **Value**: `true`  
   **Environment**: Production / Preview / Development as needed  
3. **Key**: `OPENAI_API_KEY`  
   **Value**: your OpenAI API key (starts with `sk-proj-` or `sk-`)  
   **Environment**: same as above  
4. Save and **redeploy** so the new variables are applied.

If `ENABLE_AI_INSIGHTS` is not set or not `true`, the AI Insights API returns 503. Get a key at https://platform.openai.com/api-keys if needed.

### 4. Verify Environment Variables

After redeploying, the following environment variables should be set in Vercel:

- ✅ `NEXT_PUBLIC_SUPABASE_URL` (should already be set)
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` (should already be set)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (for admin features)
- ✅ `ENABLE_AI_INSIGHTS` (set to `true` to enable AI Insights; optional)
- ✅ `OPENAI_API_KEY` (required when AI Insights is enabled; optional otherwise)

### 5. Test Ticket Deletion

After redeploying with the new environment variable:
1. Go to the admin dashboard
2. Try deleting a ticket
3. It should work without the "Missing required environment variables" error

## Troubleshooting

### If you still get the error:

1. **Check Vercel Environment Variables:**
   - Make sure `SUPABASE_SERVICE_ROLE_KEY` is set for all environments (Production, Preview, Development)
   - The value should be the full JWT token (starts with `eyJ`)

2. **Redeploy:**
   - Environment variables are only loaded on deployment
   - You must redeploy after adding new variables

3. **Check the Key:**
   - Make sure you copied the **service_role** key, not the **anon** key
   - The service_role key is longer and has different permissions

4. **Verify in Supabase:**
   - Go back to Supabase Dashboard → Settings → API
   - Confirm you're looking at the correct project
   - The key should be visible when you click "Reveal"

## Security Notes

- ✅ The service_role key is stored securely in Vercel (not in your code)
- ✅ It's only used server-side in API routes
- ✅ Never share this key publicly
- ✅ If the key is ever exposed, rotate it immediately in Supabase Dashboard
