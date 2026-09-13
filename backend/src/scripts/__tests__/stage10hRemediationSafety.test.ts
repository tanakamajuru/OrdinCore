import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..', '..', '..');
const inventory = fs.readFileSync(path.join(root, 'migrations', '142_historical_remediation_inventory.sql'), 'utf8');
const apply = fs.readFileSync(path.join(root, 'scripts', 'stage10h_apply_safe_remediation.sql'), 'utf8');
const enforcement = fs.readFileSync(path.join(root, 'migrations', '143_canonical_constraints_and_synchronisation.sql'), 'utf8');

describe('Stage 10H historical remediation safety', () => {
  it('keeps the automatic migration as an inventory rather than a data repair', () => {
    expect(inventory).toMatch(/mode\) VALUES \(inventory_id, 'INVENTORY'\)/);
    expect(inventory).not.toMatch(/UPDATE risk_actions ra\s+SET effectiveness_outcome/i);
    expect(inventory).not.toMatch(/UPDATE risks r\s+SET status/i);
    expect(inventory).not.toMatch(/DELETE FROM (risks|risk_actions|signal_clusters)/i);
  });

  it('enforces immutable reviews, tenant lineage and duplicate escalation prevention', () => {
    expect(enforcement).toMatch(/BEFORE UPDATE OR DELETE ON action_effectiveness_reviews/);
    expect(enforcement).toMatch(/validate_risk_action_tenant_lineage/);
    expect(enforcement).toMatch(/validate_escalation_tenant_lineage/);
    expect(enforcement).toMatch(/validate_governance_review_tenant_lineage/);
    expect(enforcement).toMatch(/validate_risk_signal_link_tenant_lineage/);
    expect(enforcement).toMatch(/validate_review_obligation_tenant_lineage/);
    expect(enforcement).toMatch(/prevent_duplicate_active_escalation/);
    expect(enforcement).toMatch(/uq_system_event_idempotency/);
    expect(enforcement).toMatch(/NOT VALID/);
  });

  it('does not use narrative or title matching to invent lineage', () => {
    expect(apply).not.toMatch(/ILIKE/);
    expect(apply).not.toMatch(/similarity\s*\(/i);
    expect(apply).not.toMatch(/levenshtein\s*\(/i);
    expect(apply).not.toMatch(/DELETE FROM (risks|risk_actions|signal_clusters)/i);
    expect(apply).toMatch(/governance_review_id=gr\.id/);
    expect(apply).toMatch(/source_cluster_id=sc\.id/);
    expect(apply).toMatch(/escalation_id=e\.id/);
  });

  it('preserves ambiguous records in the human-review queue', () => {
    expect(inventory).toMatch(/'DUPLICATE_ACTIVE_PATTERN'.*'PATTERN'.*'HUMAN_REVIEW'/s);
    expect(inventory).toMatch(/'DUPLICATE_ACTIVE_RISK_FOR_PATTERN'.*'RISK'.*'HUMAN_REVIEW'/s);
    expect(inventory).toMatch(/'DUPLICATE_ACTIVE_ESCALATION'.*'ESCALATION'.*'HUMAN_REVIEW'/s);
    expect(inventory).toMatch(/'TENANT_LINEAGE_MISMATCH'/);
    expect(apply).toMatch(/disposition='AUTO_SAFE'/);
    expect(apply).not.toMatch(/disposition='HUMAN_REVIEW'.*UPDATE/s);
  });
});
