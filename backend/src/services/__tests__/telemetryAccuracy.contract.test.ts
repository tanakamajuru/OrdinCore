import fs from 'fs';
import path from 'path';

describe('strategic telemetry truth contract', () => {
  const analytics = fs.readFileSync(path.join(__dirname, '../analytics.service.ts'), 'utf8');
  const trajectory = fs.readFileSync(path.join(__dirname, '../trajectory.service.ts'), 'utf8');
  const interventions = fs.readFileSync(path.join(__dirname, '../interventions.service.ts'), 'utf8');
  const trends = fs.readFileSync(path.join(__dirname, '../../../../frontend/src/app/components/Trends.tsx'), 'utf8');

  it('replaces cumulative risk creation with weekly severity-weighted signal burden', () => {
    expect(analytics).toContain("measure: 'severity_weighted_signal_burden'");
    expect(trends).toContain('Cross-Service Signal Burden');
    expect(trends).not.toContain('Cross-Site Risk Trajectory');
  });

  it('uses occurrence evidence and fixed UK calendar weeks', () => {
    expect(analytics).toContain("Europe/London");
    expect(analytics).toContain('i.occurred_at');
    expect(trajectory).toContain('gp.entry_date::date + COALESCE(gp.entry_time');
  });

  it('retains explicit zero weeks for every active service', () => {
    expect(analytics).toContain('CROSS JOIN services');
    expect(analytics).toContain('COALESCE(SUM');
  });

  it('distinguishes a confirmed zero from a missing governance submission', () => {
    expect(analytics).toContain("'confirmed_zero'");
    expect(analytics).toContain("'no_submission'");
    expect(trends).toContain('Missing governance submissions are gaps');
  });

  it('filters an intervention timeline to its source pattern when available', () => {
    expect(interventions).toContain('source_cluster_id?: string | null');
    expect(interventions).toContain('rsl.cluster_id=$4::uuid');
  });

  it('refreshes telemetry from the canonical governance refresh channel', () => {
    expect(trends).toContain('useGovernanceRefresh(loadTrendsData)');
  });
});
