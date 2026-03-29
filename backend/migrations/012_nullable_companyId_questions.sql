-- Migration 012: Make company_id nullable in governance_questions
-- This allows for system-wide templates that don't belong to a specific company.

ALTER TABLE governance_questions ALTER COLUMN company_id DROP NOT NULL;
