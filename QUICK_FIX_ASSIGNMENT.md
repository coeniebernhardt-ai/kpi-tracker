# Quick Fix for Member Assignment

## Step 1: Run SQL Migration

Go to Supabase Dashboard → SQL Editor → New Query, then run:

```sql
-- Add assigned_to column if it doesn't exist
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);

-- Verify it was created
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tickets' AND column_name = 'assigned_to';
```

## Step 2: Check Browser Console

1. Open your application in the browser
2. Press F12 to open Developer Tools
3. Go to the Console tab
4. Look for:
   - `Loaded profiles: X` - should show a number > 0
   - Any errors mentioning `assigned_to` or `column`

## Step 3: Verify Button Visibility

The "Assign Member" button should appear:
- Next to the "Open" badge in the top-right of each ticket card
- Only if you own the ticket OR you're an admin
- Only if profiles are loaded successfully

## Step 4: Test Assignment

1. Click "Assign Member" button on a ticket
2. Select a member from the dropdown
3. Check console for any errors
4. The assignment should save immediately

## Common Issues:

**Issue:** Button doesn't appear
- **Solution:** Check if profiles are loading (see console)
- **Solution:** Verify you're the ticket owner or admin

**Issue:** Error about "assigned_to" column
- **Solution:** Run the SQL migration (Step 1)

**Issue:** No profiles in dropdown
- **Solution:** Check if `getAllProfiles()` is working (check console logs)

