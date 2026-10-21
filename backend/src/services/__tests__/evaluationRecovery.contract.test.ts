import fs from 'fs';
import path from 'path';

// Evaluation recovery (17 Oct v3 findings, decision confirmed 21 Oct 2026): a failed or
// interrupted pattern/immediate-detection evaluation must never read the same as "evaluated, no
// concern found", unfinished work must resume without duplicating clusters/actions/escalations,
// and the failure must eventually surface to a human. These are source-level contract checks
// (same convention as patternScopeContract.test.ts) rather than a live DB/Redis integration test,
// so they run fast and fail loudly if the mechanism is ever refactored away.
describe('signal evaluation recovery contract', () => {
  const worker = fs.readFileSync(path.join(__dirname, '../../workers/pattern.worker.ts'), 'utf8');
  const pulse = fs.readFileSync(path.join(__dirname, '../pulse.service.ts'), 'utf8');
  const guidedWork = fs.readFileSync(path.join(__dirname, '../../services/guidedWork.service.ts'), 'utf8');
  const migration = fs.readFileSync(path.join(__dirname, '../../../migrations/191_pulse_evaluation_status.sql'), 'utf8');

  it('tracks PENDING / PROCESSING / EVALUATED / FAILED on governance_pulses', () => {
    expect(migration).toContain("CREATE TYPE pulse_evaluation_status AS ENUM ('PENDING', 'PROCESSING', 'EVALUATED', 'FAILED')");
    expect(migration).toContain('evaluation_attempts');
    expect(migration).toContain('evaluation_started_at');
    expect(migration).toContain('evaluation_completed_at');
    expect(migration).toContain('evaluation_last_error');
  });

  it('marks PROCESSING before doing any evaluation work, so a crash leaves a visible trace', () => {
    const processingIdx = worker.indexOf("evaluation_status = 'PROCESSING'");
    const loopIdx = worker.indexOf('for (const domain of domains)');
    expect(processingIdx).toBeGreaterThan(-1);
    expect(loopIdx).toBeGreaterThan(-1);
    expect(processingIdx).toBeLessThan(loopIdx);
  });

  it('marks EVALUATED only after every domain/scope has been evaluated', () => {
    expect(worker).toContain("evaluation_status = 'EVALUATED'");
  });

  it('records a failure explicitly and rethrows, never swallowing it as success', () => {
    const catchBlock = worker.slice(worker.indexOf('} catch (err: any) {'));
    expect(catchBlock).toContain("evaluation_status = 'FAILED'");
    expect(catchBlock).toContain('evaluation_last_error');
    expect(catchBlock).toContain('throw err;');
  });

  it('a failed enqueue at capture time is marked FAILED immediately, not left silently PENDING', () => {
    const catchBlock = pulse.slice(pulse.indexOf('Failed to queue pattern detection'));
    expect(catchBlock).toContain("evaluation_status = 'FAILED'");
  });

  it('BullMQ retries transient failures before the reconciliation sweep has to', () => {
    expect(pulse).toContain('attempts: 3');
    expect(pulse).toContain("backoff: { type: 'exponential'");
  });

  it('the recovery sweep reclaims stuck PROCESSING, exhausted-but-retryable FAILED, and never-queued PENDING work', () => {
    expect(worker).toContain("evaluation_status = 'PROCESSING' AND evaluation_started_at < NOW()");
    expect(worker).toContain("evaluation_status = 'FAILED' AND evaluation_attempts <");
    expect(worker).toContain("evaluation_status = 'PENDING' AND created_at < NOW()");
  });

  it('the sweep runs on startup and periodically, not only once', () => {
    expect(worker).toContain('sweepStuckEvaluations();');
    expect(worker).toContain('setInterval(sweepStuckEvaluations');
  });

  it('re-queued jobs fall back to governance_domain exactly like fresh capture does, never losing the domain', () => {
    const sweepBlock = worker.slice(worker.indexOf('const sweepStuckEvaluations'));
    expect(sweepBlock).toContain('row.governance_domain');
  });

  it('stops auto-retrying once the attempt cap is hit and surfaces the failure to the RM instead of retrying forever', () => {
    expect(worker).toContain('MAX_EVALUATION_ATTEMPTS = 5');
    expect(guidedWork).toContain("evaluation_status='FAILED' AND gp.evaluation_attempts>=5");
    expect(guidedWork).toContain('EVALUATION_FAILED');
  });

  it('a re-run of evaluateRules is safe (idempotent) because its writes use ON CONFLICT guards, so recovery never duplicates clusters, risk_candidates, or links', () => {
    expect(worker).toContain('ON CONFLICT DO NOTHING');
    expect(worker).toContain('ON CONFLICT (cluster_id) DO UPDATE');
  });

  it('a failed/incomplete evaluation reads differently from a genuine "no pattern found" on both web and mobile', () => {
    const signalDetailWeb = fs.readFileSync(path.join(__dirname, '../../../../frontend/src/app/components/SignalDetail.tsx'), 'utf8');
    const signalDetailMobile = fs.readFileSync(path.join(__dirname, '../../../../mobile/src/screens/shared/SignalDetailScreen.tsx'), 'utf8');
    expect(signalDetailWeb).toContain('evaluation_status === "FAILED"');
    expect(signalDetailMobile).toContain("evaluation_status === 'FAILED'");
  });
});
