import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import logger from '../utils/logger';

// Doctrine (Daily Governance Action Review): automatic effectiveness rating is retired. This worker
// no longer computes or writes an outcome — effectiveness is a human, evidence-based judgement, and
// the separate effectiveness reminder nudges the RM to record it. Retained only for bootstrap /
// queue compatibility and intentionally inert.
export class ActionEffectivenessPromptWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker(
      'action-effectiveness-prompt',
      async (_job: Job) => {
        logger.info('Action Effectiveness auto-rating prompt is disabled by doctrine — no-op.');
      },
      { connection: redisConnection }
    );
  }

  public async start() {
    logger.info('Action Effectiveness Prompt Worker started (inert by doctrine)');
  }

  public async stop() {
    await this.worker.close();
  }
}

export const startActionEffectivenessPromptWorker = () => {
  return new ActionEffectivenessPromptWorker();
};

export const scheduleActionEffectivenessPrompt = async (queue: any) => {
  // Schedule to run every hour (the job itself is inert; kept for queue compatibility).
  await queue.add('action-effectiveness-prompt', {}, {
    repeat: { cron: '0 * * * *' }
  });
};
