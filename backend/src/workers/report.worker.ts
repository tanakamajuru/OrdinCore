import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { query } from '../config/database';
import logger from '../utils/logger';
import { eventBus, EVENTS } from '../events/eventBus';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

export function startReportWorker() {
  const worker = new Worker('report_generation', async (job: Job) => {
    const { report_id, company_id, type, parameters } = job.data as {
      report_id: string; company_id: string; company_name?: string; type: string; parameters: Record<string, unknown>;
    };

    logger.info(`Processing report job ${job.id}: ${type}`, { report_id });

    try {
      await query("UPDATE reports SET status = 'processing' WHERE id = $1", [report_id]);

      // Generate report data based on type
      let data: any;
      let title = "Governance Report";
      const house_id = parameters?.house_id as string | undefined;

      switch (type) {
        case 'risk_summary':
          title = "Risk Register Summary";
          const risks = await query(
            `SELECT severity, status, COUNT(*) AS count FROM risks 
             WHERE company_id = $1 ${house_id ? 'AND house_id = $2' : ''} 
             GROUP BY severity, status`,
            house_id ? [company_id, house_id] : [company_id]
          );
          data = risks.rows;
          break;
        case 'incident_report':
          title = "Incident Trend Analysis";
          const incidents = await query(
            `SELECT severity, status, COUNT(*) AS count FROM incidents 
             WHERE company_id = $1 ${house_id ? 'AND house_id = $2' : ''} 
             GROUP BY severity, status`,
            house_id ? [company_id, house_id] : [company_id]
          );
          data = incidents.rows;
          break;
        case 'governance_compliance':
          title = "Governance Compliance Report";
          const compliance = await query(
            `SELECT AVG(compliance_score) AS avg_score, COUNT(*) FILTER (WHERE status = 'completed') AS completed,
             COUNT(*) FILTER (WHERE status = 'overdue') AS overdue FROM governance_pulses 
             WHERE company_id = $1 ${house_id ? 'AND house_id = $2' : ''}`,
            house_id ? [company_id, house_id] : [company_id]
          );
          data = compliance.rows[0];
          break;
        case 'escalation_report':
          title = "Escalation Activity Report";
          const escalations = await query(
            `SELECT status, priority, COUNT(*) AS count FROM escalations 
             WHERE company_id = $1 ${house_id ? 'AND house_id = $2' : ''} 
             GROUP BY status, priority`,
            house_id ? [company_id, house_id] : [company_id]
          );
          data = escalations.rows;
          break;
        case 'reconstruction_report':
          title = "Governance Reconstruction Report";
          const incident_id = parameters?.incident_id as string;
          const incidentRes = await query(
            `SELECT i.*, ic.name as category_name, h.name as house_name 
             FROM incidents i 
             LEFT JOIN incident_categories ic ON ic.id = i.category_id
             LEFT JOIN houses h ON h.id = i.house_id
             WHERE i.id = $1`,
            [incident_id]
          );
          data = incidentRes.rows[0];
          break;
        default:
          data = { message: 'Report generated', parameters };
      }

      // Generate PDF
      const fileName = `${report_id}.pdf`;
      const publicPath = path.join(__dirname, '../../public/reports');
      if (!fs.existsSync(publicPath)) {
        fs.mkdirSync(publicPath, { recursive: true });
      }
      const filePath = path.join(publicPath, fileName);
      const fileUrl = `/reports/${fileName}`;

      const doc = new PDFDocument();
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // PDF Content
      doc.fontSize(25).text(title, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Report ID: ${report_id}`);
      doc.text(`Generated At: ${new Date().toLocaleString()}`);
      doc.moveDown();
      doc.text('Data Summary:', { underline: true });
      doc.moveDown();
      doc.text(JSON.stringify(data, null, 2));
      doc.end();

      // Wait for file to finish writing
      await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', () => resolve());
        writeStream.on('error', (err) => reject(err));
      });

      await query(
        `UPDATE reports SET status = 'completed', file_url = $1, completed_at = NOW() WHERE id = $2`,
        [fileUrl, report_id]
      );

      await eventBus.emitEvent(EVENTS.REPORT_COMPLETED, { report_id, company_id, type, file_url: fileUrl });
      logger.info(`Report ${report_id} completed successfully as PDF`);
      return { success: true, file_url: fileUrl };

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
