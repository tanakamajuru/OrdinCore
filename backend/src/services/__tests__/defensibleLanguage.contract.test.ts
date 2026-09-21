import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../../../..');
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');

describe('defensible governance language contract', () => {
  it('qualifies telemetry labels and states the methodological limits', () => {
    const trends = read('frontend/src/app/components/Trends.tsx');
    expect(trends).toContain('Cross-Service Recorded Signal Burden');
    expect(trends).toContain('Cross-Service Recorded Incident Activity');
    expect(trends).toContain('not a validated clinical score, probability of harm or regulatory rating');
    expect(trends).toContain('Absence of recorded activity does not confirm absence of risk');
  });

  it('makes automated pattern output a review trigger rather than a conclusion', () => {
    const patternUi = read('frontend/src/app/components/CrossHousePatternDetection.tsx');
    const systemicUi = read('frontend/src/app/components/SystemicPatterns.tsx');
    const worker = read('backend/src/workers/pattern.worker.ts');
    expect(patternUi).toContain('Threshold met — RM review required');
    expect(systemicUi).toContain('Potential Cross-Service Patterns');
    expect(worker).toContain('this does not prove a shared cause');
    expect(worker).not.toContain("title: 'System-Level Risk detected'");
  });

  it('does not claim that association proves systemic weakness or shared cause', () => {
    const reports = read('backend/src/services/reportsData.service.ts');
    expect(reports).toContain('do not by themselves prove a shared root cause or systemic control failure');
    expect(reports).not.toContain('is read as a systemic control weakness with a likely shared root cause');
  });

  it('keeps canonical trajectory values while qualifying their interpretation', () => {
    const trajectory = read('backend/src/services/trajectory.service.ts');
    expect(trajectory).toContain("export type TrajectoryDirection = 'Improving' | 'Stable' | 'Deteriorating'");
    expect(trajectory).toContain('not a clinical prediction or confirmation that the concern is controlled');
    expect(trajectory).toContain('No material change does not mean the concern is resolved or adequately controlled');
  });
});
