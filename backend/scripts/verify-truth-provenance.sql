\set ON_ERROR_STOP on
-- 1. Signal provenance is one-to-one with governance_pulses.
SELECT CASE WHEN (SELECT COUNT(*) FROM canonical_signal_evidence_v)=(SELECT COUNT(*) FROM governance_pulses)
 THEN 'PASS' ELSE 'FAIL' END AS signal_provenance_count;

-- 2. No non-signal table can enter canonical signal evidence.
SELECT CASE WHEN EXISTS (SELECT 1 FROM canonical_signal_evidence_v WHERE evidence_type<>'SIGNAL' OR provenance_table<>'governance_pulses')
 THEN 'FAIL' ELSE 'PASS' END AS signal_type_purity;

-- 3. Direct decision lineage must always point to a real signal when pulse_entry_id is populated.
SELECT COUNT(*) AS orphan_direct_signal_decisions
FROM governance_reviews gr LEFT JOIN governance_pulses gp ON gp.id=gr.pulse_entry_id AND gp.company_id=gr.company_id
WHERE gr.pulse_entry_id IS NOT NULL AND gp.id IS NULL;

-- 4. Direct action lineage must resolve when source_pulse_id is populated.
SELECT COUNT(*) AS orphan_direct_signal_actions
FROM risk_actions ra LEFT JOIN governance_pulses gp ON gp.id=ra.source_pulse_id AND gp.company_id=ra.company_id
WHERE ra.source_pulse_id IS NOT NULL AND gp.id IS NULL;

-- 5. Direct escalation lineage must resolve when source_pulse_id is populated.
SELECT COUNT(*) AS orphan_direct_signal_escalations
FROM escalations e LEFT JOIN governance_pulses gp ON gp.id=e.source_pulse_id AND gp.company_id=e.company_id
WHERE e.source_pulse_id IS NOT NULL AND gp.id IS NULL;
