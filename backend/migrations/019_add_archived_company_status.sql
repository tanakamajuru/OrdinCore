-- Migration 019: Add archived status to companies

ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_status_check;
ALTER TABLE companies ADD CONSTRAINT companies_status_check CHECK (status IN ('active', 'inactive', 'suspended', 'archived'));
