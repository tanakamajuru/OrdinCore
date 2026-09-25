import { Worker, Queue, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { query } from '../config/database';
import logger from '../utils/logger';

// Signal durability net (doctrine §25). Pattern evaluation is enqueued best-effort after a signal
// is persisted, so a lost enqueue, a worker failure, or a direct DB insert that bypasses the
// pipeline (e.g. a seeder) leaves a persisted signal that was NEVER evaluated for patterns. The
// pattern worker links every pulse it processes to a cluster, so a recent pulse with NO
// risk_signal_links is a reliable "not yet evaluated" marker. This sweep re-enqueues those pulses;
// pattern evaluation is idempotent (its inserts are ON CONFLICT DO NOTHING).

const patternQueue = new Queue('pattern-detection', { connection: redisConnection });

export async function countUnevaluatedSignals(companyId?: string): Promise<number> {
  const rows = (await query(
    `SELECT COUNT(*)::int AS n
       FROM governance_pulses gp
      WHERE COALESCE(gp.created_at, gp.entry_date::timestamptz) >= NOW() - INTERVAL '21 days'
        AND ($1::uuid IS NULL OR gp.company_id = $1)
        AND NOT EXISTS (SELECT 1 FROM risk_signal_links l WHERE l.pulse_entry_id = gp.id)`,
    [companyId || null]
  )).rows;
  return Number(rows[0]?.n || 0);
}

export const startSignalReconciliationWorker = () => {
  const worker = new Worker('signal-reconciliation', async (_job: Job) => {
    const rows = (await query(
      `SELECT gp.id AS pulse_id, gp.company_id, gp.house_id, gp.risk_domain,
              gp.related_person, gp.service_user_id
         FROM governance_pulses gp
        WHERE COALESCE(gp.created_at, gp.entry_date::timestamptz) >= NOW() - INTERVAL '21 days'
          AND NOT EXISTS (SELECT 1 FROM risk_signal_links l WHERE l.pulse_entry_id = gp.id)
        ORDER BY gp.created_at NULLS LAST
        LIMIT 500`
    )).rows;
    let requeued = 0;
    for (const r of rows) {
      // jobId dedupes re-enqueue while a prior attempt is still in the queue/retention window.
      await patternQueue.add('pattern:check', {
        pulse_id: r.pulse_id, company_id: r.company_id, house_id: r.house_id,
        risk_domain: r.risk_domain, related_person: r.related_person, service_user_id: r.service_user_id,
      }, { jobId: `reconcile:${r.pulse_id}` });
      requeued++;
    }
    if (requeued) logger.warn(`[signal-reconciliation] re-enqueued ${requeued} unevaluated signal(s) for pattern detection`);
    return { requeued };
  }, { connection: redisConnection });

  worker.on('failed', (job, err) => logger.error(`[signal-reconciliation] job ${job?.id} failed`, err));
  return worker;
};
