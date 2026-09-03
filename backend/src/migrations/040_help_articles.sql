-- Migration: 040_help_articles.sql
-- Description: Admin-authored Help & Guidelines content, targeted at one or more roles.
--   An admin writes a heading + body and attaches media (images / videos by URL), and
--   chooses which roles should see it. Users see the published articles targeted at their role.

CREATE TABLE IF NOT EXISTS help_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  title VARCHAR(255) NOT NULL,
  body TEXT,
  -- Roles that should see this article. Empty array = visible to every role.
  target_roles TEXT[] NOT NULL DEFAULT '{}',
  -- [{ "type": "image"|"video", "url": "...", "caption": "..." }]
  media JSONB NOT NULL DEFAULT '[]',
  published BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_help_articles_company ON help_articles(company_id);
