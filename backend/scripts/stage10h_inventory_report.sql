-- Run with psql after migration 142 and BEFORE the apply script.
-- Export both result sets and obtain product-owner/developer approval for AUTO_SAFE changes.
SELECT id, mode, started_at, completed_at, executed_by, summary
  FROM governance_remediation_runs
 ORDER BY started_at DESC LIMIT 1;

SELECT company_id, disposition, issue_type, COUNT(*)::int AS records
  FROM governance_remediation_open_items
 WHERE run_id=(SELECT id FROM governance_remediation_runs ORDER BY started_at DESC LIMIT 1)
 GROUP BY company_id, disposition, issue_type
 ORDER BY company_id, disposition, issue_type;

SELECT company_id, issue_type, record_type, record_id, reason, candidate_links
  FROM governance_remediation_open_items
 WHERE run_id=(SELECT id FROM governance_remediation_runs ORDER BY started_at DESC LIMIT 1)
   AND disposition='HUMAN_REVIEW'
 ORDER BY company_id, issue_type, record_id;
