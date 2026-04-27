-- Migration 032: Fix risk_signal_links for cluster support
-- 1. Add cluster_id column
ALTER TABLE risk_signal_links ADD COLUMN IF NOT EXISTS cluster_id UUID REFERENCES signal_clusters(id) ON DELETE CASCADE;

-- 2. Make risk_id nullable (since clusters don't have risks yet)
ALTER TABLE risk_signal_links ALTER COLUMN risk_id DROP NOT NULL;

-- 3. Update unique constraint
-- Remove old one first
ALTER TABLE risk_signal_links DROP CONSTRAINT IF EXISTS risk_signal_links_risk_id_pulse_entry_id_key;

-- Add new composite unique constraint (either risk_id or cluster_id must be present)
-- But for simplicity and to support the worker's logic:
CREATE UNIQUE INDEX IF NOT EXISTS idx_risk_signal_links_cluster_pulse ON risk_signal_links (cluster_id, pulse_entry_id) WHERE cluster_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_risk_signal_links_risk_pulse ON risk_signal_links (risk_id, pulse_entry_id) WHERE risk_id IS NOT NULL;
