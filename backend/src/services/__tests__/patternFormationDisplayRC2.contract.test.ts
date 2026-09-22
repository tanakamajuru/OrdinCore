import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../../../..');
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');

describe('RC2 pattern formation display contract', () => {
  const source = read('frontend/src/app/components/Rm5Interface.tsx');

  it('does not claim there is one current signal when the qualifying count is zero', () => {
    expect(source).not.toContain('Watch — 1 signal (not yet a pattern)');
    expect(source).toContain('currentCount === 0 && historicalCount > 0');
    expect(source).toContain('No qualifying signals in the current ${windowDays}-day window · ${historicalCount} historical');
  });

  it('shows progress from the current qualifying count rather than historical evidence', () => {
    expect(source).toContain('Math.min(currentCount, threshold)');
    expect(source).toContain('Watch — ${currentCount} of ${threshold} related signals');
    expect(source).toContain('No current qualifying signals');
  });

  it('keeps the critical-signal exception explicit', () => {
    expect(source).toContain('Critical signal — RM review required despite numerical threshold');
  });
});
