-- Fix role constraint issues
-- Run this in pgAdmin or psql

-- First, let's see what the current table structure looks like
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Check if there's an enum type for user_role
SELECT typname, typcategory 
FROM pg_type 
WHERE typname LIKE '%user%role%';

-- Drop any existing constraints that might be causing issues
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Remove any enum type if it exists (this might be causing the issue)
DROP TYPE IF EXISTS user_role CASCADE;

-- Now add a simple check constraint without enum
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'registered-manager', 'responsible-individual', 'director'));

-- Verify the table structure
\d users
