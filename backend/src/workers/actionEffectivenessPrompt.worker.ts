import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { query } from '../config/database';
import { notificationsService } from '../services/notifications.service';
import logger from '../utils/logger';

export class ActionEffectivenessPromptWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker(
      'action-effectiveness-prompt',
      async (job: Job) => {
        logger.info(`Running action effectiveness prompt scan...`);
        
        // Find actions completed 48-72h ago without effectiveness rating
        const actions = await query(`
          SELECT ra.*, h.primary_rm_id, h.name as house_name
          FROM risk_actions ra
          JOIN risks r ON r.id = ra.risk_id
          JOIN houses h ON h.id = r.house_id
          WHERE ra.status = 'Completed' 
          AND ra.effectiveness IS NULL
          AND ra.completed_at <= NOW() - INTERVAL '48 hours'
          AND ra.completed_at >= NOW() - INTERVAL '72 hours'
        `);

        for (const action of actions.rows) {
          if (action.primary_rm_id) {
            await notificationsService.create({
              company_id: action.company_id,
              user_id: action.primary_rm_id,
              type: 'ACTION_EFFECTIVENESS_DUE',
              title: 'Action Effectiveness Rating Required',
              body: `The action "${action.title}" for ${action.house_name} was completed 48h ago. Please rate its effectiveness.`,
              link: `/dashboard/oversight`,
              metadata: { action_id: action.id, risk_id: action.risk_id }
            });
            logger.info(`Effectiveness prompt sent to RM ${action.primary_rm_id} for action ${action.id}`);
          }
        }
      },
      { connection: redisConnection }
    );
  }

  public async start() {
    logger.info('Action Effectiveness Prompt Worker started');
  }

  public async stop() {
    await this.worker.close();
  }
}

export const startActionEffectivenessPromptWorker = () => {
    return new ActionEffectivenessPromptWorker();
};

export const scheduleActionEffectivenessPrompt = async (queue: any) => {
    // Schedule to run every hour
    await queue.add('action-effectiveness-prompt', {}, {
        repeat: { cron: '0 * * * *' }
    });
};
