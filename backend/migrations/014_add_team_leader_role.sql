-- Migration 014: Add Team Leader Role and Standardize Roles
-- First, normalize existing shorthand roles to full names
UPDATE users SET role = 'REGISTERED_MANAGER' WHERE role = 'RM';
UPDATE users SET role = 'DIRECTOR' WHERE role = 'DIR';
UPDATE users SET role = 'RESPONSIBLE_INDIVIDUAL' WHERE role = 'RI';
UPDATE users SET role = 'TEAM_LEADER' WHERE role = 'TL';

-- Update the check constraint on users table to include TEAM_LEADER
-- We also include shorthands just in case there are other dependencies, but full names are preferred
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER', 'RESPONSIBLE_INDIVIDUAL', 'DIRECTOR', 'TEAM_LEADER', 'RM', 'TL', 'RI', 'DIR'));

-- Insert TEAM_LEADER into roles table if it doesn't exist
INSERT INTO roles (name, description)
VALUES ('TEAM_LEADER', 'Team Leader access')
ON CONFLICT (name) DO NOTHING;
