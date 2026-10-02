import { deriveEscalationLifecycle } from '../escalationLifecycle.service';

describe('canonical escalation lifecycle', () => {
  it('separates action completion from effectiveness', () => {
    expect(deriveEscalationLifecycle({ reviewed: true, actions: [{ status: 'Completed' }] })).toBe('Awaiting Effectiveness');
  });
  it('keeps Too Early in monitoring', () => {
    expect(deriveEscalationLifecycle({ reviewed: true, actions: [{ status: 'Completed', effectiveness_outcome: 'Too Early To Assess' }] })).toBe('Monitoring');
  });
  it('marks completed effective evidence ready, not closed', () => {
    expect(deriveEscalationLifecycle({ reviewed: true, actions: [{ status: 'Completed', effectiveness_outcome: 'Effective' }] })).toBe('Ready For Closure');
  });
  it('returns failed or partial controls to review', () => {
    expect(deriveEscalationLifecycle({ reviewed: true, actions: [{ status: 'Completed', effectiveness_outcome: 'Not Effective' }] })).toBe('Under Review');
    expect(deriveEscalationLifecycle({ reviewed: true, actions: [{ status: 'Completed', effectiveness_outcome: 'Partially Effective' }] })).toBe('Under Review');
  });
  it('never reopens a closed escalation by calculation', () => {
    expect(deriveEscalationLifecycle({ current: 'Resolved', reviewed: true, actions: [{ status: 'In Progress' }] })).toBe('Closed');
  });
  it('does not hold at Awaiting Effectiveness for a completion-only (exempt) control', () => {
    // A completion-only control carries no effectiveness obligation; completing it reaches the
    // effectiveness stage (brief 5 R2/A3) rather than blocking forever as "effectiveness not reviewed".
    expect(deriveEscalationLifecycle({ reviewed: true, actions: [{ status: 'Completed', review_requirement: 'COMPLETION_ONLY' }] })).toBe('Ready For Closure');
  });
  it('still blocks when a required control is completed but unreviewed, ignoring exempt ones', () => {
    expect(deriveEscalationLifecycle({ reviewed: true, actions: [
      { status: 'Completed', review_requirement: 'COMPLETION_ONLY' },
      { status: 'Completed', review_requirement: 'EFFECTIVENESS_REQUIRED' },
    ] })).toBe('Awaiting Effectiveness');
  });
  it('is ready when the only effectiveness-bearing control is Effective and the rest are exempt', () => {
    expect(deriveEscalationLifecycle({ reviewed: true, actions: [
      { status: 'Completed', review_requirement: 'COMPLETION_ONLY' },
      { status: 'Completed', review_requirement: 'EFFECTIVENESS_REQUIRED', effectiveness_outcome: 'Effective' },
    ] })).toBe('Ready For Closure');
  });
});
