-- Add severity column to tickets table
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Add severity column if it doesn't exist
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS severity TEXT CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT'));

-- Set default severity for existing tickets
UPDATE tickets 
SET severity = 'MEDIUM' 
WHERE severity IS NULL;

-- Add comment to column
COMMENT ON COLUMN tickets.severity IS 'Severity level: LOW (green), MEDIUM (yellow), HIGH (orange), URGENT (red)';
