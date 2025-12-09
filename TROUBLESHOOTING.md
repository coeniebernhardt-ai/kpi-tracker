# Troubleshooting: Features Not Showing on Deployment

## Issues to Check

### 1. Logo Not Showing

**Possible Causes:**
- Logo file not in git repository
- Browser cache showing old version
- Build error on Vercel

**Solutions:**
1. ✅ Logo file has been committed (just done)
2. Clear browser cache:
   - Chrome/Edge: `Ctrl + Shift + Delete` → Clear cached images
   - Or use Incognito/Private mode
3. Check Vercel build logs for errors
4. Verify file exists on GitHub:
   - Go to: https://github.com/coeniebernhardt-ai/kpi-tracker/tree/main/public
   - Look for `thinkdigital-logo.png`

### 2. Severity Dropdown Not Showing

**Possible Causes:**
- Code not deployed (check Vercel deployment)
- Database migration not run
- TypeScript/build errors

**Solutions:**
1. **Run Database Migration** (CRITICAL):
   - Go to Supabase Dashboard → SQL Editor
   - Run the contents of `ADD_SEVERITY_COLUMN.sql`:
   ```sql
   ALTER TABLE tickets 
   ADD COLUMN IF NOT EXISTS severity TEXT CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')) DEFAULT 'MEDIUM';
   
   UPDATE tickets 
   SET severity = 'MEDIUM' 
   WHERE severity IS NULL;
   
   ALTER TABLE tickets 
   ALTER COLUMN severity SET NOT NULL;
   ```

2. **Check Vercel Build Logs:**
   - Go to Vercel Dashboard → Your Project → Deployments
   - Click on latest deployment
   - Check "Build Logs" for errors

3. **Verify Code is Deployed:**
   - Check GitHub: https://github.com/coeniebernhardt-ai/kpi-tracker
   - Verify `app/dashboard/page.tsx` has severity dropdown code
   - Verify `app/lib/supabase.ts` has severity in Ticket interface

### 3. Severity Badges Not Showing

**Possible Causes:**
- Database migration not run (tickets don't have severity values)
- Old tickets created before migration

**Solutions:**
1. Run the database migration (see above)
2. Create a new ticket - it should have severity
3. Existing tickets will default to MEDIUM after migration

## Step-by-Step Fix

### Step 1: Verify Logo File is on GitHub
1. Go to: https://github.com/coeniebernhardt-ai/kpi-tracker
2. Navigate to `public/` folder
3. Check if `thinkdigital-logo.png` exists
4. If NOT, the commit didn't work - manually upload it via GitHub web interface

### Step 2: Run Database Migration
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to SQL Editor → New Query
4. Copy and paste contents of `ADD_SEVERITY_COLUMN.sql`
5. Click "Run"

### Step 3: Check Vercel Deployment
1. Go to: https://vercel.com/coenie-bernhardts-projects/kpi-tracker
2. Check latest deployment status
3. If failed, check build logs
4. If successful, wait 1-2 minutes for deployment to complete

### Step 4: Clear Browser Cache
1. Open site in Incognito/Private window
2. Or clear cache: `Ctrl + Shift + Delete`
3. Hard refresh: `Ctrl + F5` or `Ctrl + Shift + R`

### Step 5: Verify Features
1. **Logo**: Should appear on login, dashboard, admin pages
2. **Severity Dropdown**: 
   - Click "Open New Ticket" on dashboard
   - Should see "Severity" dropdown after "Type" field
3. **Severity Badges**: 
   - Create a new ticket with severity
   - Should see colored badge (🟢 LOW, 🟡 MEDIUM, 🟠 HIGH, 🔴 CRITICAL)

## Quick Verification Commands

Run these locally to verify code is correct:

```powershell
# Check logo file exists
Test-Path public\thinkdigital-logo.png

# Check severity code exists
Select-String -Path app\dashboard\page.tsx -Pattern "severity"

# Check Logo component exists
Test-Path app\components\Logo.tsx
```

## If Still Not Working

1. **Check Vercel Build Logs** for TypeScript errors
2. **Check Browser Console** (F12) for JavaScript errors
3. **Verify Environment Variables** in Vercel are set correctly
4. **Check Supabase RLS Policies** haven't changed
5. **Try creating a new deployment** manually in Vercel

## Expected Results After Fix

✅ Logo visible on all pages (login, dashboard, admin, home)  
✅ Severity dropdown in ticket creation form  
✅ Severity badges on tickets (colored: LOW=green, MEDIUM=yellow, HIGH=orange, CRITICAL=red)  
✅ New tickets default to MEDIUM severity  
✅ All existing tickets show MEDIUM severity after migration
