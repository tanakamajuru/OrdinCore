-- Migration 053: Simplify signal capture (spec module 1)
-- A signal is a simple concern: category + severity + description + when.
-- Relax the legacy 12-field NOT NULL constraints and add the 'Medium' severity
-- label used in the new UI. risk_domain is already TEXT[] so categories like
-- 'Service Delivery' / 'Wellbeing' / 'Documentation' need no enum change.

ALTER TYPE severity_level ADD VALUE IF NOT EXISTS 'Medium' AFTER 'Low';

ALTER TABLE governance_pulses ALTER COLUMN signal_type DROP NOT NULL;
ALTER TABLE governance_pulses ALTER COLUMN immediate_action DROP NOT NULL;
ALTER TABLE governance_pulses ALTER COLUMN has_happened_before DROP NOT NULL;
ALTER TABLE governance_pulses ALTER COLUMN pattern_concern DROP NOT NULL;
ALTER TABLE governance_pulses ALTER COLUMN escalation_required DROP NOT NULL;
