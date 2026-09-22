import fs from 'fs';
import path from 'path';
import { deriveCanonicalControlPosition } from '../canonicalControlPosition.service';
import { deriveCanonicalGovernanceState } from '../canonicalGovernanceState.service';

const root = path.resolve(__dirname, '../../../..');
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');

describe('V6 effectiveness eligibility contract', () => {
  const trajectory = { direction: 'Improving', evidence: { current14DaySignals: 0 } };

  it('never turns completion-only work into an effectiveness requirement', () => {
    const facts: any = { id:'c1', title:'Send notification', status:'Completed', review_requirement:'COMPLETION_ONLY', completed_at:'2026-09-20' };
    const position = deriveCanonicalControlPosition([facts]);
    expect(position.total).toBe(0);
    const state = deriveCanonicalGovernanceState({ riskId:'r1', riskClosed:false, actions:[facts], escalations:[], trajectory });
    expect(state.effectiveness.required).toBe(0);
    expect(state.effectiveness.outstanding).toBe(0);
    expect(state.closure.blockers.some((b:any)=>b.code==='EFFECTIVENESS_REQUIRED')).toBe(false);
  });

  it('recognises a final canonical outcome even when the legacy field is absent', () => {
    const control: any = { id:'a1', status:'Completed', review_requirement:'EFFECTIVENESS_REQUIRED', effectiveness_outcome:'Effective', effectiveness:null, completed_at:'2026-09-19', effectiveness_reviewed_at:'2026-09-20' };
    const state = deriveCanonicalGovernanceState({ riskId:'r1', riskClosed:false, actions:[control], escalations:[], trajectory });
    expect(state.effectiveness.finalised).toBe(1);
    expect(state.effectiveness.outstanding).toBe(0);
  });

  it('keeps Too Early interim without offering an immediate repeat before its due date', () => {
    const riskUi = read('frontend/src/app/components/RiskDetail.tsx');
    expect(riskUi).toContain("action.effectiveness_outcome !== 'Too Early To Assess'");
    expect(riskUi).toContain('Interim review complete · final review due');
  });

  it('reconciles stale obligations without deleting evidence', () => {
    const migration = read('backend/migrations/158_effectiveness_eligibility_reconciliation.sql');
    expect(migration).toContain("ra.review_requirement = 'COMPLETION_ONLY'");
    expect(migration).toContain("ra.effectiveness_outcome IN ('Effective', 'Partially Effective', 'Not Effective')");
    expect(migration).not.toMatch(/DELETE\s+FROM/i);
  });
});
