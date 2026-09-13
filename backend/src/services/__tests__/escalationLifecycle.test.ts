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
});
