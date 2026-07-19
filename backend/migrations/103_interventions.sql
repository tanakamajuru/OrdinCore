-- Migration 103: Intervention Panel.
-- OrdinCore is trajectory-based governance, not a dashboard of counts. Every governance
-- theme (risk domain) can carry ONE active intervention — the leadership response — with an
-- owner, status, review date and expected outcome. The trajectory + weekly timeline are
-- computed from the theme's signals; this table stores the human decision layer on top.
CREATE TABLE IF NOT EXISTS interventions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  theme VARCHAR(160) NOT NULL,
  house_id UUID REFERENCES houses(id) ON DELETE SET NULL,   -- null = organisation-wide
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  owner_role VARCHAR(40),
  intervention TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Planned',            -- Planned | In Progress | Complete | On Hold
  expected_outcome TEXT,
  review_date DATE,
  started_at TIMESTAMPTZ,                                   -- when the intervention began (timeline marker)
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- One active intervention per company + theme + scope (org-wide rows share a sentinel scope).
CREATE UNIQUE INDEX IF NOT EXISTS idx_interventions_theme_scope
  ON interventions (company_id, theme, COALESCE(house_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX IF NOT EXISTS idx_interventions_company ON interventions(company_id);
