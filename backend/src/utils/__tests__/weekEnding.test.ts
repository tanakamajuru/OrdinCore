import { normalizeWeekEnding, normalizeWeekEndingSafe, formatWeekEndingUK } from '../weekEnding';

// Locks the critical RI roll-up date defect: week_ending is a date-only governance key and must
// resolve to the same UK calendar date in both BST and GMT, never shifting to the previous UTC day.
describe('weekEnding date-only normaliser', () => {
  it('passes a date-only value through unchanged', () => {
    expect(normalizeWeekEnding('2026-09-26')).toBe('2026-09-26');
  });

  it('maps a BST 23:00Z timestamp to the correct UK date (not the previous UTC day)', () => {
    // Midnight 26 Sep in British Summer Time is serialised as 23:00Z on 25 Sep.
    expect(normalizeWeekEnding('2026-09-25T23:00:00.000Z')).toBe('2026-09-26');
  });

  it('keeps a GMT (winter) midnight timestamp on the same date', () => {
    // Midnight 10 Jan is 00:00Z in GMT.
    expect(normalizeWeekEnding('2026-01-10T00:00:00.000Z')).toBe('2026-01-10');
  });

  it('throws on a non-date value', () => {
    expect(() => normalizeWeekEnding('not-a-date')).toThrow();
  });

  it('safe variant returns empty string instead of throwing', () => {
    expect(normalizeWeekEndingSafe('nonsense')).toBe('');
    expect(normalizeWeekEndingSafe('2026-09-26')).toBe('2026-09-26');
  });

  it('formats a UK label without shifting the day', () => {
    expect(formatWeekEndingUK('2026-09-26')).toBe('26 September 2026');
    expect(formatWeekEndingUK('2026-09-25T23:00:00.000Z')).toBe('26 September 2026');
  });
});
