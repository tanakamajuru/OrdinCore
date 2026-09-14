import { deriveRiskReviewState } from '../riskReviewObligations.service';

describe('canonical scheduled risk review state', () => {
  const now = new Date('2026-09-14T12:00:00Z');
  it('separates due, overdue and under-review states', () => {
    expect(deriveRiskReviewState({ obligationStatus:'OPEN', dueAt:'2026-09-15', now })).toBe('DUE');
    expect(deriveRiskReviewState({ obligationStatus:'OPEN', dueAt:'2026-09-13', now })).toBe('OVERDUE');
    expect(deriveRiskReviewState({ obligationStatus:'OPEN', dueAt:'2026-09-13', underReview:true, now })).toBe('UNDER_REVIEW');
  });
  it('does not label an unscheduled risk awaiting', () => {
    expect(deriveRiskReviewState({ obligationStatus:null, dueAt:null, now })).toBe('NOT_DUE');
  });
  it('treats a completed obligation or closed risk as completed', () => {
    expect(deriveRiskReviewState({ obligationStatus:'COMPLETED', dueAt:'2026-09-13', now })).toBe('COMPLETED');
    expect(deriveRiskReviewState({ closed:true, obligationStatus:'OPEN', dueAt:'2026-09-13', now })).toBe('COMPLETED');
  });
});
