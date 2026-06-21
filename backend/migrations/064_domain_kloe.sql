-- Migration 064: map each governance domain to its CQC Key Line of Enquiry so reports
-- and reconstructions can auto-reference the right inspection evidence (Admin JSX: Risk
-- Domains carries a KLOE column). Additive; backfilled by domain name, editable after.
ALTER TABLE governance_domains
  ADD COLUMN IF NOT EXISTS kloe_code  VARCHAR(8),
  ADD COLUMN IF NOT EXISTS kloe_label VARCHAR(20);

UPDATE governance_domains SET kloe_code = m.code, kloe_label = m.label
FROM (VALUES
  ('Medication Governance',  'S4', 'Safe'),
  ('Safeguarding',           'S1', 'Safe'),
  ('Self-Neglect',           'S2', 'Safe'),
  ('Exploitation / Cuckooing','S1','Safe'),
  ('Community Risk',         'S2', 'Safe'),
  ('Client Safety',          'S1', 'Safe'),
  ('Visit Reliability',      'S2', 'Safe'),
  ('Environmental Safety',   'S3', 'Safe'),
  ('Mental Health Stability','E3', 'Effective'),
  ('Treatment Engagement',   'E3', 'Effective'),
  ('Physical Health',        'E3', 'Effective'),
  ('Community & Wellbeing',  'E3', 'Effective'),
  ('Quality & Experience',   'C1', 'Caring'),
  ('Workforce Reliability',  'W2', 'Well-Led'),
  ('Placement Stability',    'W4', 'Well-Led'),
  ('Care Continuity',        'W4', 'Well-Led')
) AS m(name, code, label)
WHERE governance_domains.name = m.name AND governance_domains.kloe_code IS NULL;
