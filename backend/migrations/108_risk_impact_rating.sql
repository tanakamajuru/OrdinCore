-- Migration 108: Impact is a compulsory HUMAN rating (High/Medium/Low).
-- The system measures what it can observe (frequency, trajectory, control effectiveness); the
-- consequence-if-it-happens is a clinical judgement a human makes. Impact drives S in the Risk
-- Index (High=5, Medium=3, Low=2), so the computed grade combines the human's impact call with
-- the system's measurements. Required on the Oversight Register.
ALTER TABLE risks ADD COLUMN IF NOT EXISTS impact_rating VARCHAR(10);
