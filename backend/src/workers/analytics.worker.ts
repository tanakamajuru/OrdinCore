import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { query } from '../config/database';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export function startAnalyticsWorker() {
  const worker = new Worker('trend_analysis', async (job: Job) => {
    const { company_id, date } = job.data as { company_id: string; date: string };

    logger.info(`Processing analytics snapshot for company ${company_id}`);

    const [risks, incidents, governance, escalations, houses, users] = await Promise.all([
      query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'open') AS open, COUNT(*) FILTER (WHERE status = 'resolved') AS resolved, COUNT(*) FILTER (WHERE severity = 'critical') AS critical FROM risks WHERE company_id = $1`, [company_id]),
      query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'open') AS open FROM incidents WHERE company_id = $1`, [company_id]),
      query(`SELECT COALESCE(100.0 * COUNT(*) FILTER (WHERE review_status != 'New') / NULLIF(COUNT(*), 0), 0) AS compliance_rate FROM governance_pulses WHERE company_id = $1`, [company_id]),
      query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'resolved') AS resolved FROM escalations WHERE company_id = $1`, [company_id]),
      query(`SELECT COUNT(*) AS total FROM houses WHERE company_id = $1 AND status = 'active'`, [company_id]),
      query(`SELECT COUNT(*) AS total FROM users WHERE company_id = $1 AND status = 'active'`, [company_id]),
    ]);

    const snapshot = {
      id: uuidv4(),
      company_id,
      snapshot_date: date || new Date().toISOString().split('T')[0],
      total_risks: parseInt(risks.rows[0].total),
      open_risks: parseInt(risks.rows[0].open),
      resolved_risks: parseInt(risks.rows[0].resolved),
      critical_risks: parseInt(risks.rows[0].critical),
      total_incidents: parseInt(incidents.rows[0].total),
      open_incidents: parseInt(incidents.rows[0].open),
      governance_compliance_rate: parseFloat(governance.rows[0].compliance_rate),
      total_escalations: parseInt(escalations.rows[0].total),
      resolved_escalations: parseInt(escalations.rows[0].resolved),
      house_count: parseInt(houses.rows[0].total),
      user_count: parseInt(users.rows[0].total),
    };

    await query(
      `INSERT INTO analytics_snapshots (id, company_id, snapshot_date, total_risks, open_risks, resolved_risks, critical_risks, total_incidents, open_incidents, governance_compliance_rate, total_escalations, resolved_escalations, house_count, user_count)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (company_id, snapshot_date) DO UPDATE SET
         total_risks = EXCLUDED.total_risks, open_risks = EXCLUDED.open_risks,
         resolved_risks = EXCLUDED.resolved_risks, critical_risks = EXCLUDED.critical_risks,
         total_incidents = EXCLUDED.total_incidents, open_incidents = EXCLUDED.open_incidents,
         governance_compliance_rate = EXCLUDED.governance_compliance_rate,
         total_escalations = EXCLUDED.total_escalations, resolved_escalations = EXCLUDED.resolved_escalations`,
      Object.values(snapshot)
    );

    logger.info(`Analytics snapshot created for company ${company_id}`);
    return snapshot;
  }, { connection: redisConnection, concurrency: 1 });

  worker.on('failed', (job: Job | undefined, err: Error) => logger.error(`Analytics job ${job?.id} failed`, err));
  return worker;
}
