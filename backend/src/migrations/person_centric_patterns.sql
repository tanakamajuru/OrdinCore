-- Migration: Implement Person-Specific Pattern Detection (Ordin Core Spec)

-- 1. Database Schema Updates
ALTER TABLE signal_clusters ADD COLUMN IF NOT EXISTS linked_person VARCHAR(200);
ALTER TABLE risk_candidates ADD COLUMN IF NOT EXISTS linked_person VARCHAR(200);
ALTER TABLE risks ADD COLUMN IF NOT EXISTS linked_person VARCHAR(200);

-- 2. Performance Indexing
CREATE INDEX IF NOT EXISTS idx_pulse_related_person 
ON governance_pulses(house_id, risk_domain, related_person, entry_date) 
WHERE related_person IS NOT NULL;
