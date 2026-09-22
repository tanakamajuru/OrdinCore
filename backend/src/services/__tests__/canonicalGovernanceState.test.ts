import { deriveCanonicalGovernanceState } from '../canonicalGovernanceState.service';

const base = { riskId: 'risk-1', riskClosed: false, escalations: [] as any[], trajectory: { direction: 'Improving', evidence: { current14DaySignals: 0 } }, calculatedAt: '2026-09-13T12:00:00.000Z' };

describe('canonical governance state resolver', () => {
  it('makes a completed effective control ready when no blocker remains', () => {
    const state = deriveCanonicalGovernanceState({ ...base, actions: [{ id: 'a1', title: 'Control', status: 'Complete', review_requirement: 'EFFECTIVENESS_REQUIRED', effectiveness_outcome: 'Effective' }] });
    expect(state.closure).toMatchObject({ eligible: true, status: 'READY_FOR_CLOSURE', blockers: [] });
  });
  it('treats Too Early as interim and creates a direct review blocker', () => {
    const state = deriveCanonicalGovernanceState({ ...base, actions: [{ id: 'a1', status: 'Completed', review_requirement: 'EFFECTIVENESS_REQUIRED', effectiveness_outcome: 'Too Early To Assess' }] });
    expect(state.effectiveness).toMatchObject({ finalised: 0, too_early: 1, outstanding: 1 });
    expect(state.closure.blockers).toContainEqual(expect.objectContaining({ code: 'OBSERVATION_INCOMPLETE', record_id: 'a1', route: '/effectiveness?focus=a1' }));
  });
  it('normalises Resolved as closed and identifies the exact open escalation', () => {
    const state = deriveCanonicalGovernanceState({ ...base, actions: [{ id: 'a1', status: 'Completed', review_requirement: 'EFFECTIVENESS_REQUIRED', effectiveness_outcome: 'Effective' }], escalations: [{ id: 'e1', lifecycle_status: 'Resolved' }, { id: 'e2', lifecycle_status: 'Under Review' }] });
    expect(state.escalation).toMatchObject({ id: 'e2', is_open: true });
    expect(state.closure.blockers).toContainEqual(expect.objectContaining({ code: 'OPEN_ESCALATION', record_id: 'e2' }));
  });
  it('allows closure with a Partially Effective control — policy: only Not Effective hard-blocks', () => {
    const state = deriveCanonicalGovernanceState({ ...base, actions: [{ id: 'a1', status: 'Completed', review_requirement: 'EFFECTIVENESS_REQUIRED', effectiveness: 'Neutral' }] });
    expect(state.effectiveness.latest_final_outcome).toBe('Partially Effective');
    expect(state.closure.blockers).not.toContainEqual(expect.objectContaining({ code: 'CONTROL_PARTIAL' }));
    expect(state.closure).toMatchObject({ eligible: true, status: 'READY_FOR_CLOSURE' });
  });
  it('still hard-blocks closure on a Not Effective control', () => {
    const state = deriveCanonicalGovernanceState({ ...base, actions: [{ id: 'a1', status: 'Completed', review_requirement: 'EFFECTIVENESS_REQUIRED', effectiveness_outcome: 'Not Effective' }] });
    expect(state.closure.blockers).toContainEqual(expect.objectContaining({ code: 'CONTROL_FAILED' }));
    expect(state.closure.eligible).toBe(false);
  });
});
