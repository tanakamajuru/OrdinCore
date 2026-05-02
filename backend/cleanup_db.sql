-- Cleanup script for duplicate risk signal links
-- Run this before pnpm migrate to fix index violations

DELETE FROM risk_signal_links a USING (
      SELECT MIN(ctid) as ctid, risk_id, pulse_id, cluster_id
      FROM risk_signal_links 
      GROUP BY risk_id, pulse_id, cluster_id
      HAVING COUNT(*) > 1
) b
WHERE a.risk_id = b.risk_id 
AND a.pulse_id = b.pulse_id 
AND a.cluster_id = b.cluster_id
AND a.ctid > b.ctid;

-- Also add the missing columns directly to avoid migration chain failures
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risk_actions' AND column_name = 'effectiveness_measured_at') THEN
        ALTER TABLE risk_actions ADD COLUMN effectiveness_measured_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks' AND column_name = 'is_active') THEN
        ALTER TABLE risks ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'is_active') THEN
        ALTER TABLE incidents ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;
