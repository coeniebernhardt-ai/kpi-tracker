-- Add assigned_to column to tickets table
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Add assigned_to column (if it doesn't exist)
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN tickets.assigned_to IS 'ID of the team member assigned to work on this ticket';

-- Create index for faster queries on assigned tickets
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);

-- Note: This allows both the ticket owner (user_id) and assigned member (assigned_to) 
-- to collaborate on the ticket by adding updates and comments.

