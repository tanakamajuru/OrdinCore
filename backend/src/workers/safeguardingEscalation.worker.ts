import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { query } from '../config/database';
import { notificationsService } from '../services/notifications.service';
import logger from '../utils/logger';

export class SafeguardingEscalationWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker(
      'safeguarding-escalation',
      async (job: Job) => {
        const { pulse_id, company_id, house_id } = job.data;
        logger.info(`Checking 4h acknowledgment for safeguarding signal ${pulse_id}`);

        // Check if the threshold event is still 'Pending'
        const event = await query(
            "SELECT status FROM threshold_events WHERE pulse_id = $1 AND rule_name = 'Safeguarding During Absence'",
            [pulse_id]
        );

        if (event.rows[0] && event.rows[0].status === 'Pending') {
            logger.warn(`4H TIMEOUT: Safeguarding signal ${pulse_id} still not acknowledged. Escalating to external oversight.`);
            
            // Notify all Directors again with "CRITICAL ESCALATION"
            const directors = await query("SELECT id FROM users WHERE company_id = $1 AND role = 'DIRECTOR'", [company_id]);
            
            for (const dir of directors.rows) {
                await notificationsService.create({
                    company_id,
                    user_id: dir.id,
                    type: 'CRITICAL_GOVERNANCE_FAILURE',
                    title: 'CRITICAL: 4h Safeguarding Timeout',
                    body: `A safeguarding signal for house ${house_id} has remained unacknowledged for 4 hours during RM absence. Immediate intervention required.`,
                    link: `/dashboard/oversight`,
                    metadata: { pulse_id, house_id }
                });
            }
        }
      },
      { connection: redisConnection }
    );
  }

  public async start() {
    logger.info('Safeguarding Escalation Worker started');
  }

  public async stop() {
    await this.worker.close();
  }
}

export const startSafeguardingEscalationWorker = () => {
    return new SafeguardingEscalationWorker();
};
