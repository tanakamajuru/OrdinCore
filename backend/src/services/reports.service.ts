import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';
import { eventBus, EVENTS } from '../events/eventBus';

const reportQueue = new Queue('report_generation', { connection: redisConnection });

export class ReportsService {
  async requestReport(company_id: string, user_id: string, data: { type: string; name: string; parameters?: Record<string, unknown> }) {
    const id = uuidv4();
    await query(
      `INSERT INTO reports (id, company_id, type, name, status, generated_by, parameters)
       VALUES ($1,$2,$3,$4,'pending',$5,$6) RETURNING *`,
      [id, company_id, data.type, data.name, user_id, JSON.stringify(data.parameters || {})]
    );

    const job = await reportQueue.add('generate', { report_id: id, company_id, user_id, type: data.type, parameters: data.parameters || {} });

    await query(
      `INSERT INTO report_requests (id, company_id, report_id, requested_by, report_type, parameters, status, job_id)
       VALUES ($1,$2,$3,$4,$5,$6,'queued',$7)`,
      [uuidv4(), company_id, id, user_id, data.type, JSON.stringify(data.parameters || {}), job.id]
    );

    await eventBus.emitEvent(EVENTS.REPORT_REQUESTED, { report_id: id, company_id, user_id });
    const result = await query('SELECT * FROM reports WHERE id = $1', [id]);
    return result.rows[0];
  }

  async findAll(company_id: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [reports, countResult] = await Promise.all([
      query(
        `SELECT r.*, u.first_name || ' ' || u.last_name AS generated_by_name
         FROM reports r
         JOIN users u ON u.id = r.generated_by
         WHERE r.company_id = $1
         ORDER BY r.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
        [company_id]
      ),
      query('SELECT COUNT(*) FROM reports WHERE company_id = $1', [company_id]),
    ]);
    return { reports: reports.rows, total: parseInt(countResult.rows[0].count), page, limit };
  }

  async findById(id: string, company_id: string) {
    const result = await query('SELECT * FROM reports WHERE id = $1 AND company_id = $2', [id, company_id]);
    if (!result.rows[0]) throw new Error('Report not found');
    return result.rows[0];
  }

  async getDownloadUrl(id: string, company_id: string) {
    const report = await this.findById(id, company_id);
    if (report.status !== 'completed') throw new Error('Report is not ready for download');
    if (!report.file_url) throw new Error('Report file not available');
    return { file_url: report.file_url };
  }
}

export const reportsService = new ReportsService();
