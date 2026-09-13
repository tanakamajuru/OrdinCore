-- Stage 10C: canonical escalation lifecycle. Additive first so deployed code and
-- historic rows remain readable during a rolling release.
ALTER TYPE escalation_lifecycle_status ADD VALUE IF NOT EXISTS 'Actions In Progress';
ALTER TYPE escalation_lifecycle_status ADD VALUE IF NOT EXISTS 'Awaiting Effectiveness';
ALTER TYPE escalation_lifecycle_status ADD VALUE IF NOT EXISTS 'Monitoring';
ALTER TYPE escalation_lifecycle_status ADD VALUE IF NOT EXISTS 'Ready For Closure';

UPDATE escalations SET lifecycle_status='Actions In Progress' WHERE lifecycle_status::text='Actions Implemented';
UPDATE escalations SET lifecycle_status='Monitoring' WHERE lifecycle_status::text='Monitoring Effectiveness';

