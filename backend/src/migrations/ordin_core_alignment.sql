-- Update enums to match Ordin Core specification
-- Note: PostgreSQL doesn't support direct rename of enum values easily without a bit of gymnastics.
-- We'll use the ALTER TYPE ADD VALUE or just recreate if needed.

-- Signal Type: Incident, Concern, Observation, Safeguarding, Medication, Staffing, Environment, Positive signal
ALTER TYPE signal_type ADD VALUE 'Positive signal' AFTER 'Positive';
-- We'll map 'Positive' to 'Positive signal' in the application layer if needed, or just keep both for now to avoid breaking existing data.

-- Pattern Concern: None / Possible repeat / Clear repeat / Escalating
ALTER TYPE pattern_concern ADD VALUE 'Possible repeat' AFTER 'Possible';
ALTER TYPE pattern_concern ADD VALUE 'Clear repeat' AFTER 'Clear';

-- Escalation Level: No escalation / Manager review / Urgent review / Immediate escalation
ALTER TYPE escalation_level ADD VALUE 'No escalation' BEFORE 'None';
ALTER TYPE escalation_level ADD VALUE 'Manager review' AFTER 'Manager Review';
ALTER TYPE escalation_level ADD VALUE 'Urgent review' AFTER 'Urgent Review';
ALTER TYPE escalation_level ADD VALUE 'Immediate escalation' AFTER 'Immediate Escalation';

-- Update pulses to use new values where applicable (migration of existing data)
UPDATE governance_pulses SET signal_type = 'Positive signal' WHERE signal_type = 'Positive';
UPDATE governance_pulses SET pattern_concern = 'Possible repeat' WHERE pattern_concern = 'Possible';
UPDATE governance_pulses SET pattern_concern = 'Clear repeat' WHERE pattern_concern = 'Clear';
UPDATE governance_pulses SET escalation_required = 'No escalation' WHERE escalation_required = 'None';
UPDATE governance_pulses SET escalation_required = 'Manager review' WHERE escalation_required = 'Manager Review';
UPDATE governance_pulses SET escalation_required = 'Urgent review' WHERE escalation_required = 'Urgent Review';
UPDATE governance_pulses SET escalation_required = 'Immediate escalation' WHERE escalation_required = 'Immediate Escalation';

-- Add last_daily_review_at to houses for fallback logic
ALTER TABLE houses ADD COLUMN IF NOT EXISTS last_daily_review_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE houses ADD COLUMN IF NOT EXISTS primary_rm_id UUID REFERENCES users(id);
ALTER TABLE houses ADD COLUMN IF NOT EXISTS deputy_rm_id UUID REFERENCES users(id);

-- Ensure governance_pulses has mandatory constraints for fields 7, 8, 9, 10, 11
ALTER TABLE governance_pulses ALTER COLUMN immediate_action SET NOT NULL;
ALTER TABLE governance_pulses ALTER COLUMN severity SET NOT NULL;
ALTER TABLE governance_pulses ALTER COLUMN has_happened_before SET NOT NULL;
ALTER TABLE governance_pulses ALTER COLUMN pattern_concern SET NOT NULL;
ALTER TABLE governance_pulses ALTER COLUMN escalation_required SET NOT NULL;
