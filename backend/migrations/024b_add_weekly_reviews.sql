-- Migration 024b: Add weekly_reviews table
-- This table was originally defined in a .ts file but needs to be a .sql file
-- for the standard migration runner to execute it in order.

CREATE TABLE IF NOT EXISTS weekly_reviews (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  house_id UUID NOT NULL REFERENCES houses(id),
  week_ending DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  content JSONB NOT NULL DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(house_id, week_ending)
);
