-- ============================================
-- FIX SEVERITY CONSTRAINT - RUN THIS NOW
-- ============================================
-- This fixes the error: "violates check constraint tickets_severity_check"
-- 
-- INSTRUCTIONS:
-- 1. Go to: https://supabase.com/dashboard
-- 2. Select your project
-- 3. Click "SQL Editor" in the left sidebar
-- 4. Click "New Query"
-- 5. Copy and paste ALL the SQL below
-- 6. Click "Run" (or press Ctrl+Enter)
-- ============================================

-- Step 1: Drop the old constraint (if it exists)
ALTER TABLE tickets 
DROP CONSTRAINT IF EXISTS tickets_severity_check;

-- Step 2: Add the new constraint with URGENT (not CRITICAL)
ALTER TABLE tickets 
ADD CONSTRAINT tickets_severity_check 
CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT'));

-- Step 3: Update any existing CRITICAL values to URGENT
UPDATE tickets 
SET severity = 'URGENT' 
WHERE severity = 'CRITICAL';

-- Step 4: Verify the constraint was created correctly
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'tickets'::regclass
  AND conname = 'tickets_severity_check';

-- Expected output should show:
-- constraint_name: tickets_severity_check
-- constraint_definition: CHECK (severity = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'URGENT'::text]))
