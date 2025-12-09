-- Add severity column to tickets table
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Add severity column with default value
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS severity TEXT CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')) DEFAULT 'MEDIUM';

-- Update existing tickets to have MEDIUM severity if they don't have one
UPDATE tickets 
SET severity = 'MEDIUM' 
WHERE severity IS NULL;

-- Make severity NOT NULL after setting defaults
ALTER TABLE tickets 
ALTER COLUMN severity SET NOT NULL;
