-- Update admin password with correct bcrypt hash
UPDATE users SET password_hash = '$2a$12$mtN.Sn0T0SATpERoNc3mBO3rO4QpvZ72r8UAo482qNqi8AMCxD1bi' WHERE email = 'admin@caresignal.com';

-- Verify the update
SELECT email, role, is_active FROM users WHERE email = 'admin@caresignal.com';
