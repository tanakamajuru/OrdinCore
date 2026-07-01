-- ============================================================================
-- Migration 085: gap-free governance-domain → CQC-domain (KLOE) alignment.
-- ----------------------------------------------------------------------------
-- Every report that references CQC domains joins governance_domains.kloe_code /
-- kloe_label. This backfills the full mapping for EVERY domain row (both sectors)
-- authoritatively — no `WHERE kloe_code IS NULL` guard — so no risk/cluster can
-- show a blank CQC domain, and the reports agree with each other. The mapping is a
-- professional judgement (review with the nominated individual / quality lead); it
-- is data-seeded and editable per row in the Admin "Risk Domains" screen.
-- ============================================================================

UPDATE governance_domains d
   SET kloe_code = m.code, kloe_label = m.label
  FROM (VALUES
    ('Safeguarding',             'S1', 'Safe'),
    ('Exploitation / Cuckooing', 'S1', 'Safe'),
    ('Client Safety',            'S1', 'Safe'),
    ('Self-Neglect',             'S2', 'Safe'),
    ('Community Risk',           'S2', 'Safe'),
    ('Visit Reliability',        'S2', 'Safe'),
    ('Environmental Safety',     'S3', 'Safe'),
    ('Medication Governance',    'S4', 'Safe'),
    ('Physical Health',          'E3', 'Effective'),
    ('Mental Health Stability',  'E3', 'Effective'),
    ('Treatment Engagement',     'E3', 'Effective'),
    ('Community & Wellbeing',     'E3', 'Effective'),
    ('Quality & Experience',     'C1', 'Caring'),
    ('Care Continuity',          'R1', 'Responsive'),
    ('Placement Stability',      'R1', 'Responsive'),
    ('Workforce Reliability',    'W2', 'Well-Led')
  ) AS m(name, code, label)
 WHERE d.name = m.name;

-- Safety net: any domain still unmapped (a future/renamed one) defaults to Well-Led —
-- an unclassified governance concern is by definition a "how is this service led /
-- governed" question. Guarantees no report ever renders a blank CQC domain.
UPDATE governance_domains
   SET kloe_code = 'W2', kloe_label = 'Well-Led'
 WHERE kloe_code IS NULL OR kloe_label IS NULL OR kloe_label = '';
