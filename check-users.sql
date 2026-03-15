-- Check and fix user data
-- Run this in pgAdmin or psql

-- Check current users
SELECT id, email, name, role, organization, is_active FROM users;

-- Update admin user to have proper role
UPDATE users SET role = 'admin' WHERE email = 'admin@caresignal.com';

-- Update other users to have proper roles
UPDATE users SET role = 'registered-manager' WHERE email IN ('john.smith@caresignal.com', 'sarah.jones@caresignal.com', 'michael.brown@caresignal.com', 'emily.davis@caresignal.com', 'david.wilson@caresignal.com');
UPDATE users SET role = 'responsible-individual' WHERE email IN ('jennifer.miller@caresignal.com', 'robert.taylor@caresignal.com');
UPDATE users SET role = 'director' WHERE email IN ('lisa.anderson@caresignal.com', 'james.thomas@caresignal.com');

-- Make sure admin user is active
UPDATE users SET is_active = true WHERE email = 'admin@caresignal.com';

-- Check again
SELECT id, email, name, role, organization, is_active FROM users;
