-- Migration 065: real CRUD config for Action Templates and Review Cycles
-- (Admin JSX -> Governance Configuration). Both are tenant-owned (per company).

-- Reusable action templates the RM can pick when creating an action on a risk.
CREATE TABLE IF NOT EXISTS action_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  domain_name  VARCHAR(80),                 -- optional: applies to a governance domain (NULL = any)
  title        VARCHAR(200) NOT NULL,
  description  TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_action_templates_company ON action_templates(company_id, is_active);

-- Governance review cadences (Daily / Weekly / Monthly ...). Drives the cadence the
-- organisation operates to; editable per company.
CREATE TABLE IF NOT EXISTS review_cycles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name         VARCHAR(120) NOT NULL,
  cadence      VARCHAR(20) NOT NULL,        -- Daily | Weekly | Fortnightly | Monthly | Quarterly
  day_of_week  VARCHAR(12),                 -- for Weekly/Fortnightly (e.g. 'Monday')
  description  TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_review_cycles_company ON review_cycles(company_id, is_active);

-- Seed the governance cadences the engine already operates to, for every existing company.
INSERT INTO review_cycles (company_id, name, cadence, day_of_week, description)
SELECT c.id, v.name, v.cadence, v.dow, v.descr
FROM companies c
CROSS JOIN (VALUES
  ('Daily Governance Review', 'Daily',    NULL,     'RM confirms daily oversight; 48h/72h absence escalation.'),
  ('Weekly Governance Review','Weekly',  'Monday', 'The 13-step weekly interpretation, finalised and validated.'),
  ('Effectiveness Review',    'Monthly',  NULL,     'Action effectiveness re-rated; trajectory reassessed.')
) AS v(name, cadence, dow, descr)
WHERE NOT EXISTS (SELECT 1 FROM review_cycles rc WHERE rc.company_id = c.id AND rc.name = v.name);

-- A few starter action templates per company, keyed to common domains.
INSERT INTO action_templates (company_id, domain_name, title, description)
SELECT c.id, v.domain, v.title, v.descr
FROM companies c
CROSS JOIN (VALUES
  ('Medication Governance', 'Audit MAR charts and retrain staff', 'Re-count stock, correct chart errors, evidence competency.'),
  ('Safeguarding',          'Raise safeguarding alert and review care plan', 'Notify the local authority and update the risk assessment.'),
  ('Self-Neglect',          'Daily welfare check and GP referral', 'Document engagement daily; escalate if no improvement.'),
  (NULL,                    'Commission an external review', 'Independent review where an internal control may be insufficient.')
) AS v(domain, title, descr)
WHERE NOT EXISTS (SELECT 1 FROM action_templates at2 WHERE at2.company_id = c.id AND at2.title = v.title);
