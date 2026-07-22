-- Migration: 039_tl_notes_documents.sql
-- Description: Backing store for the Team Leader mobile "Notes" and "Documents" screens.
--   house_notes — shift / handover / general notes logged against a house.
--   documents   — care plans, risk assessments, policies etc., per-house or company-wide.

-- 1. House notes (handover log)
CREATE TABLE IF NOT EXISTS house_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  house_id UUID NOT NULL REFERENCES houses(id),
  author_id UUID REFERENCES users(id),
  category VARCHAR(30) NOT NULL DEFAULT 'general', -- 'handover' | 'shift' | 'general'
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_house_notes_house ON house_notes(house_id);
CREATE INDEX IF NOT EXISTS idx_house_notes_company ON house_notes(company_id);

-- 2. Documents (governance document library)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  house_id UUID REFERENCES houses(id), -- nullable: NULL = company-wide (e.g. a policy)
  title VARCHAR(255) NOT NULL,
  category VARCHAR(40) NOT NULL DEFAULT 'other', -- care_plan|risk_assessment|policy|procedure|house_record|training_record|other
  file_url TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'current', -- current|archived|draft
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documents_house ON documents(house_id);
CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
