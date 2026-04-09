-- Migration 020: Fix Governance Pulse Statuses
-- The current constraint on the production server is too restrictive and lacks statuses like DRAFT, SUBMITTED, and LOCKED.

ALTER TABLE governance_pulses DROP CONSTRAINT IF EXISTS governance_pulses_status_check;

ALTER TABLE governance_pulses 
ADD CONSTRAINT governance_pulses_status_check 
CHECK (status IN (
    'DRAFT', 
    'SUBMITTED', 
    'LOCKED', 
    'COMPLETED', 
    'PENDING', 
    'OVERDUE', 
    'SKIPPED',
    'pending', 
    'in_progress', 
    'completed', 
    'overdue', 
    'skipped'
));
