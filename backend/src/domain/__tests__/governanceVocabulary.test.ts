import {
  effectivenessReviewState,
  isOpenEscalation,
  normalizeActionStatus,
  normalizeEscalationLifecycle,
} from '../governanceVocabulary';

describe('canonical governance vocabulary', () => {
  it.each([
    ['Resolved', 'Closed'],
    ['closed', 'Closed'],
    ['pending', 'Open'],
    ['Actions Implemented', 'Actions In Progress'],
    ['Monitoring Effectiveness', 'Monitoring'],
  ])('normalises legacy escalation %s to %s', (legacy, expected) => {
    expect(normalizeEscalationLifecycle(legacy)).toBe(expected);
  });

  it('uses the same open/closed meaning for legacy and canonical states', () => {
    expect(isOpenEscalation('Resolved')).toBe(false);
    expect(isOpenEscalation('Closed')).toBe(false);
    expect(isOpenEscalation('Under Review')).toBe(true);
  });

  it('does not count Too Early as a final effectiveness review', () => {
    expect(effectivenessReviewState(null)).toBe('NOT_REVIEWED');
    expect(effectivenessReviewState('Too Early To Assess')).toBe('INTERIM');
    expect(effectivenessReviewState('Effective')).toBe('FINAL');
    expect(effectivenessReviewState('Ineffective')).toBe('FINAL');
  });

  it.each([
    ['pending', 'Open'],
    ['started', 'In Progress'],
    ['Complete', 'Completed'],
    ['canceled', 'Cancelled'],
  ])('normalises legacy action %s to %s', (legacy, expected) => {
    expect(normalizeActionStatus(legacy)).toBe(expected);
  });
});
