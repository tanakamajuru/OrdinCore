import { buildFourWeekSeries, computeTrajectory } from '../trajectory.service';

describe('authoritative trajectory engine', () => {
  it('recognises clear improvement across equal 14-day periods', () => {
    const tr = computeTrajectory([3, 3, 1, 1], ['Effective'], [3, 3, 1, 1]);
    expect(tr.direction).toBe('Improving');
    expect(tr.evidence?.previous14DayWeight).toBe(6);
    expect(tr.evidence?.current14DayWeight).toBe(2);
  });

  it('allows high historic burden to improve instead of forcing deterioration', () => {
    const tr = computeTrajectory([6, 4, 1, 0], ['Effective'], [2, 2, 1, 0]);
    expect(tr.direction).toBe('Improving');
  });

  it('recognises genuine deterioration', () => {
    const tr = computeTrajectory([1, 1, 4, 5], ['Not Effective'], [1, 1, 2, 3]);
    expect(tr.direction).toBe('Deteriorating');
  });

  it('keeps broadly unchanged evidence stable', () => {
    const tr = computeTrajectory([2, 2, 2, 2], ['Too Early To Assess'], [1, 1, 1, 1]);
    expect(tr.direction).toBe('Stable');
  });

  it('does not let one effectiveness rating override strong contradictory signal movement', () => {
    const worsening = computeTrajectory([1, 1, 5, 5], ['Effective'], [1, 1, 2, 2]);
    expect(worsening.direction).toBe('Deteriorating');

    const improving = computeTrajectory([5, 5, 1, 1], ['Not Effective'], [2, 2, 1, 1]);
    expect(improving.direction).toBe('Improving');
  });

  it('preserves zero-signal weeks instead of dropping them', () => {
    const now = new Date('2026-08-11T12:00:00.000Z');
    const signals = [
      { occurred_at: new Date(now.getTime() - 25 * 86400000), severity: 'High' },
      { occurred_at: new Date(now.getTime() - 18 * 86400000), severity: 'High' },
      { occurred_at: new Date(now.getTime() - 2 * 86400000), severity: 'Low' },
    ];
    const series = buildFourWeekSeries(signals, now);
    expect(series.points).toEqual([3, 3, 0, 1]);
    expect(series.counts).toEqual([1, 1, 0, 1]);
  });

  it('retains the existing three-state UI when there is no evidence', () => {
    const tr = computeTrajectory([0, 0, 0, 0], [], [0, 0, 0, 0]);
    expect(tr.direction).toBe('Stable');
    expect(tr.evidence?.sufficientHistory).toBe(false);
    expect(tr.basis).toMatch(/pending evidence/i);
  });
});
