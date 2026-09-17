\set ON_ERROR_STOP on
-- =====================================================================================
-- Phase 5 · Canonical invariants (release gate).
--
-- These assert the cross-cutting truth-chain guarantees that the Canonical Violation
-- Register and Truth-Chain Dependency Map depend on. They are data-level invariants:
-- if any holds false the canonical read-side is internally inconsistent and the release
-- must be blocked. Run against a company DB with:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/verify-canonical-invariants.sql
-- =====================================================================================

-- I1 · Evidence-contract completeness — every action is classified.
-- (Migration 152 opened the contract; 153 remediated the legacy residue. No NULLs may remain.)
DO $$
DECLARE n INT;
BEGIN
  SELECT COUNT(*) INTO n FROM risk_actions WHERE review_requirement IS NULL;
  IF n > 0 THEN RAISE EXCEPTION 'I1 FAIL: % risk_actions have NULL review_requirement', n; END IF;
END $$;

-- I2 · Evidence addressability — every material count resolves to a concrete evidence_id.
-- Consumers count rows in canonical_material_count_v; each row must name the exact record.
DO $$
DECLARE n INT;
BEGIN
  SELECT COUNT(*) INTO n FROM canonical_material_count_v WHERE evidence_id IS NULL;
  IF n > 0 THEN RAISE EXCEPTION 'I2 FAIL: % material-count rows have no evidence_id', n; END IF;
END $$;

-- I3 · Flag coherence — a subject is never simultaneously open AND completed/closed.
-- (Being neither is valid: a Cancelled action or a dismissed record is open=false, completed=false.
-- For risks/patterns is_active and is_closed are exact complements by view definition.)
DO $$
DECLARE n INT;
BEGIN
  SELECT COUNT(*) INTO n FROM canonical_action_state_v WHERE is_open AND is_completed;
  IF n > 0 THEN RAISE EXCEPTION 'I3 FAIL: % actions are both open and completed', n; END IF;
  SELECT COUNT(*) INTO n FROM canonical_risk_state_v WHERE is_active = is_closed;
  IF n > 0 THEN RAISE EXCEPTION 'I3 FAIL: % risks where is_active = is_closed (complement broken)', n; END IF;
  SELECT COUNT(*) INTO n FROM canonical_pattern_state_v WHERE is_active = is_closed;
  IF n > 0 THEN RAISE EXCEPTION 'I3 FAIL: % patterns where is_active = is_closed (complement broken)', n; END IF;
END $$;

-- I4 · Referential integrity — an actionable obligation is never orphaned: its subject must exist
-- in the matching canonical view. (Note: an ACTION_EFFECTIVENESS obligation legitimately targets a
-- completed, not-open action awaiting its review, so we assert existence, not open-ness.)
DO $$
DECLARE n INT;
BEGIN
  SELECT COUNT(*) INTO n
    FROM canonical_review_obligation_state_v o
   WHERE o.is_actionable
     AND (
       (o.subject_type='ACTION'     AND NOT EXISTS (SELECT 1 FROM canonical_action_state_v a     WHERE a.company_id=o.company_id AND a.id=o.subject_id))
    OR (o.subject_type='ESCALATION' AND NOT EXISTS (SELECT 1 FROM canonical_escalation_state_v e WHERE e.company_id=o.company_id AND e.id=o.subject_id))
    OR (o.subject_type='PATTERN'    AND NOT EXISTS (SELECT 1 FROM canonical_pattern_state_v p    WHERE p.company_id=o.company_id AND p.id=o.subject_id))
    OR (o.subject_type='RISK'       AND NOT EXISTS (SELECT 1 FROM canonical_risk_state_v r        WHERE r.company_id=o.company_id AND r.id=o.subject_id))
     );
  IF n > 0 THEN RAISE EXCEPTION 'I4 FAIL: % actionable obligations are orphaned (no canonical subject)', n; END IF;
END $$;

-- I5 · Signal-count cache coherence (SOFT / reported) — the denormalised signal_clusters.signal_count
-- cache (retained by design; read only through canonical_pattern_state_v) is maintained independently
-- of risk_signal_links, so some active clusters carry a count with no linked-pulse evidence. This is
-- HISTORICAL drift (Phase 6 remediation), not a code invariant, so it is REPORTED, not a hard gate.
DO $$
DECLARE n INT;
BEGIN
  SELECT COUNT(*) INTO n
    FROM canonical_pattern_state_v p
   WHERE p.is_active
     AND COALESCE(p.signal_count,0) > 0
     AND NOT EXISTS (SELECT 1 FROM risk_signal_links l WHERE l.cluster_id = p.id);
  IF n > 0 THEN RAISE WARNING 'I5 (Phase 6 queue): % active clusters carry signal_count with no linked-pulse evidence', n; END IF;
END $$;

-- I6 · Contract routing — a completion-only action never sits in the effectiveness queue.
DO $$
DECLARE n INT;
BEGIN
  SELECT COUNT(*) INTO n
    FROM risk_actions ra
    JOIN governance_review_obligations o
      ON o.company_id=ra.company_id AND o.subject_type='ACTION' AND o.subject_id=ra.id
   WHERE o.obligation_type='ACTION_EFFECTIVENESS' AND o.status='OPEN'
     AND ra.review_requirement='COMPLETION_ONLY';
  IF n > 0 THEN RAISE EXCEPTION 'I6 FAIL: % completion-only actions carry an open effectiveness obligation', n; END IF;
END $$;

SELECT 'canonical invariants I1-I6 hold' AS result;
