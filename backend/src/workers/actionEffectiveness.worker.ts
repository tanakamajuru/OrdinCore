import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import logger from '../utils/logger';

// Doctrine (Daily Governance Action Review): automatic effectiveness rating is retired. The fixed
// 48-hour assumption no longer writes outcomes or moves trajectory — effectiveness is a human,
// evidence-based judgement recorded through the effectiveness endpoint, which remains authoritative.
// This worker is retained only for bootstrap / queue compatibility and is intentionally inert.
export const startActionEffectivenessWorker = () => {
  const worker = new Worker('action-effectiveness', async (_job: Job) => {
    logger.info('Action Effectiveness auto-rating is disabled by doctrine (human review is authoritative) — no-op.');
  }, { connection: redisConnection });

  worker.on('failed', (job, err) => {
    logger.error(`Action effectiveness job ${job?.id} failed`, err);
  });

  return worker;
};
