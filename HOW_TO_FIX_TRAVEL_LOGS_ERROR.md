# How to Fix "Could not find the 'end_address' column" Error

## The Problem
Your database table `travel_logs` is missing the new columns (`start_address`, `end_address`, `is_return_trip`, etc.) that were added in recent updates.

## Solution: Run the SQL Migration

### Step-by-Step Instructions:

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Sign in to your account

2. **Select Your Project**
   - Click on your project (the one with database `csbliwkldlglbniqmdin`)

3. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query" button

4. **Copy and Paste This SQL:**
   ```sql
   -- Add start_address column (if it doesn't exist)
   ALTER TABLE travel_logs 
   ADD COLUMN IF NOT EXISTS start_address TEXT;

   -- Add end_address column (if it doesn't exist)
   ALTER TABLE travel_logs 
   ADD COLUMN IF NOT EXISTS end_address TEXT;

   -- Add is_return_trip column (if it doesn't exist)
   ALTER TABLE travel_logs 
   ADD COLUMN IF NOT EXISTS is_return_trip BOOLEAN DEFAULT FALSE;

   -- Add distance_travelled column (if it doesn't exist)
   ALTER TABLE travel_logs 
   ADD COLUMN IF NOT EXISTS distance_travelled NUMERIC(10, 2);

   -- Add attachments column (if it doesn't exist)
   ALTER TABLE travel_logs 
   ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
   ```

5. **Run the Query**
   - Click the "Run" button (or press Ctrl+Enter / Cmd+Enter)
   - Wait for the success message: "Success. No rows returned"

6. **Verify the Columns Were Added**
   - Go to "Table Editor" in the left sidebar
   - Click on `travel_logs` table
   - You should now see the new columns: `start_address`, `end_address`, `is_return_trip`, `distance_travelled`, `attachments`

7. **Refresh Your Application**
   - Go back to your application
   - Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)
   - Try creating a travel log again

## Alternative: Quick Check

If you want to verify which columns currently exist, run this query first:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'travel_logs'
ORDER BY ordinal_position;
```

This will show you all columns in the `travel_logs` table.

## Still Having Issues?

If you still get errors after running the migration:
1. Make sure you're running the SQL in the correct project
2. Check that the table name is exactly `travel_logs` (case-sensitive)
3. Try refreshing the Supabase schema cache by waiting a few seconds after running the SQL
4. Check the SQL Editor for any error messages

