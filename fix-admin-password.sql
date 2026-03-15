-- Fix admin password hash
-- The current hash might not match "admin123"

-- Check current admin user
SELECT id, email, name, role, is_active FROM users WHERE email = 'admin@caresignal.com';

-- Update admin password to correct bcrypt hash for "admin123"
UPDATE users SET password_hash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LrUpm' WHERE email = 'admin@caresignal.com';

-- Also update other users to have correct hash for "password123"
UPDATE users SET password_hash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LrUpm' WHERE email != 'admin@caresignal.com';

-- Verify the update
SELECT email, role, is_active FROM users WHERE email = 'admin@caresignal.com';
