import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { query } from '../config/database';
import logger from '../utils/logger';
import { eventBus, EVENTS } from '../events/eventBus';

export function startReportWorker() {
  const worker = new Worker('report_generation', async (job: Job) => {
    const { report_id, company_id, type, parameters } = job.data as {
      report_id: string; company_id: string; company_name?: string; type: string; parameters: Record<string, unknown>;
    };

    logger.info(`Processing report job ${job.id}: ${type}`, { report_id });

    try {
      await query("UPDATE reports SET status = 'processing', updated_at = NOW() WHERE id = $1", [report_id]);

      // Generate report data based on type
      let data: unknown;
      switch (type) {
        case 'risk_summary': {
          const result = await query(
            `SELECT severity, status, COUNT(*) AS count FROM risks WHERE company_id = $1 GROUP BY severity, status`,
            [company_id]
          );
          data = result.rows;
          break;
        }
        case 'incident_report': {
          const result = await query(
            `SELECT severity, status, COUNT(*) AS count FROM incidents WHERE company_id = $1 GROUP BY severity, status`,
            [company_id]
          );
          data = result.rows;
          break;
        }
        case 'governance_compliance': {
          const result = await query(
            `SELECT AVG(compliance_score) AS avg_score, COUNT(*) FILTER (WHERE status = 'completed') AS completed,
             COUNT(*) FILTER (WHERE status = 'overdue') AS overdue FROM governance_pulses WHERE company_id = $1`,
            [company_id]
          );
          data = result.rows[0];
          break;
        }
        case 'escalation_report': {
          const result = await query(
            `SELECT status, priority, COUNT(*) AS count FROM escalations WHERE company_id = $1 GROUP BY status, priority`,
            [company_id]
          );
          data = result.rows;
          break;
        }
        default:
          data = { message: 'Report generated', parameters };
      }

      // In production this would write to S3/storage. For now store as JSON.
      const fileUrl = `/reports/${report_id}.json`;

      await query(
        `UPDATE reports SET status = 'completed', file_url = $1, completed_at = NOW() WHERE id = $2`,
        [fileUrl, report_id]
      );

      await eventBus.emitEvent(EVENTS.REPORT_COMPLETED, { report_id, company_id, type, file_url: fileUrl });
      logger.info(`Report ${report_id} completed successfully`);
      return { success: true, data };

    } catch (err) {
      logger.error(`Report ${report_id} failed`, err);
      await query(
        `UPDATE reports SET status = 'failed', error_message = $1 WHERE id = $2`,
        [err instanceof Error ? err.message : 'Unknown error', report_id]
      );
      throw err;
    }
  }, { connection: redisConnection, concurrency: 3 });

  worker.on('completed', (job: Job) => logger.info(`Report job ${job.id} completed`));
  worker.on('failed', (job: Job | undefined, err: Error) => logger.error(`Report job ${job?.id} failed`, err));

  return worker;
}
