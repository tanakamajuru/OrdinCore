import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../../../..');
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');

describe('riskless immediate-escalation closure contract', () => {
  it('does not manufacture a risk or post-risk-review obligation', () => {
    const service = read('backend/src/services/closure.service.ts');
    expect(service).toContain('const requiresPostClosureRiskReview = !!linkedRiskId');
    expect(service).toContain("closure_route: requiresPostClosureRiskReview ? 'RETURN_TO_RISK' : 'CLOSED_WITHOUT_RISK'");
    expect(service).not.toContain('post_closure_risk_review_required = TRUE');
  });

  it('retains the evidence-based no-action closure route', () => {
    const service = read('backend/src/services/closure.service.ts');
    const modal = read('frontend/src/components/ClosureReviewModal.tsx');
    expect(service).toContain("'IMMEDIATE_MEASURE'");
    expect(service).toContain("'EXTERNAL_INTERVENTION'");
    expect(modal).toContain('A risk or artificial action is not required');
  });

  it('repairs queue state without deleting historical records', () => {
    const migration = read('backend/migrations/157_riskless_escalation_closure.sql');
    expect(migration).toContain('post_closure_risk_review_required = FALSE');
    expect(migration).toContain('AND open_e.is_open');
    expect(migration).not.toMatch(/DELETE\s+FROM/i);
  });
});
