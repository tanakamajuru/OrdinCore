-- Insert default superadmins if not present
INSERT INTO users (id, email, password_hash, first_name, last_name, role, company_id, status, created_at, updated_at)
SELECT 
  CAST(id AS uuid), 
  email, 
  password_hash, 
  first_name, 
  last_name, 
  role, 
  CAST(company_id AS uuid), 
  status, 
  created_at, 
  updated_at 
FROM (VALUES
  ('11111111-1111-1111-1111-ffffffffff01', 'superadmin1@ordincore.co.uk', '$2a$10$vg9v3qQ1AYhFM7Car.6Z3OowmmC4S877/UhQG0Vv8GGWSoFKc.A0y', 'System', 'Superadmin 1', 'SUPER_ADMIN', (SELECT id FROM companies LIMIT 1), 'active', NOW(), NOW()),
  ('11111111-1111-1111-1111-ffffffffff02', 'superadmin2@ordincore.co.uk', '$2a$10$vg9v3qQ1AYhFM7Car.6Z3OowmmC4S877/UhQG0Vv8GGWSoFKc.A0y', 'System', 'Superadmin 2', 'SUPER_ADMIN', (SELECT id FROM companies LIMIT 1), 'active', NOW(), NOW()),
  ('11111111-1111-1111-1111-ffffffffff03', 'superadmin3@ordincore.co.uk', '$2a$10$vg9v3qQ1AYhFM7Car.6Z3OowmmC4S877/UhQG0Vv8GGWSoFKc.A0y', 'System', 'Superadmin 3', 'SUPER_ADMIN', (SELECT id FROM companies LIMIT 1), 'active', NOW(), NOW()),
  ('11111111-1111-1111-1111-ffffffffff04', 'superadmin4@ordincore.co.uk', '$2a$10$vg9v3qQ1AYhFM7Car.6Z3OowmmC4S877/UhQG0Vv8GGWSoFKc.A0y', 'System', 'Superadmin 4', 'SUPER_ADMIN', (SELECT id FROM companies LIMIT 1), 'active', NOW(), NOW())
) AS data(id, email, password_hash, first_name, last_name, role, company_id, status, created_at, updated_at)
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = data.email);
