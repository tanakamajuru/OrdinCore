-- Quick fix for users table
-- Run this in pgAdmin or psql

-- Add role column back as VARCHAR
ALTER TABLE users ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'registered-manager';

-- Add the check constraint
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'registered-manager', 'responsible-individual', 'director'));

-- Update existing users to have proper roles
UPDATE users SET role = 'admin' WHERE email = 'admin@caresignal.com';
UPDATE users SET role = 'registered-manager' WHERE email LIKE '%.caresignal.com' AND email != 'admin@caresignal.com';

-- Show the table structure
\d users
