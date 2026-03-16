"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startReportWorker = startReportWorker;
const bullmq_1 = require("bullmq");
const redis_1 = require("../config/redis");
const database_1 = require("../config/database");
const logger_1 = __importDefault(require("../utils/logger"));
const eventBus_1 = require("../events/eventBus");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pdfkit_1 = __importDefault(require("pdfkit"));
function startReportWorker() {
    const worker = new bullmq_1.Worker('report_generation', async (job) => {
        const { report_id, company_id, type, parameters } = job.data;
        logger_1.default.info(`Processing report job ${job.id}: ${type}`, { report_id });
        try {
            await (0, database_1.query)("UPDATE reports SET status = 'processing' WHERE id = $1", [report_id]);
            // Generate report data based on type
            let data;
            let title = "Governance Report";
            switch (type) {
                case 'risk_summary':
                    title = "Risk Register Summary";
                    const risks = await (0, database_1.query)(`SELECT severity, status, COUNT(*) AS count FROM risks WHERE company_id = $1 GROUP BY severity, status`, [company_id]);
                    data = risks.rows;
                    break;
                case 'incident_report':
                    title = "Incident Trend Analysis";
                    const incidents = await (0, database_1.query)(`SELECT severity, status, COUNT(*) AS count FROM incidents WHERE company_id = $1 GROUP BY severity, status`, [company_id]);
                    data = incidents.rows;
                    break;
                case 'governance_compliance':
                    title = "Governance Compliance Report";
                    const compliance = await (0, database_1.query)(`SELECT AVG(compliance_score) AS avg_score, COUNT(*) FILTER (WHERE status = 'completed') AS completed,
             COUNT(*) FILTER (WHERE status = 'overdue') AS overdue FROM governance_pulses WHERE company_id = $1`, [company_id]);
                    data = compliance.rows[0];
                    break;
                case 'escalation_report':
                    title = "Escalation Activity Report";
                    const escalations = await (0, database_1.query)(`SELECT status, priority, COUNT(*) AS count FROM escalations WHERE company_id = $1 GROUP BY status, priority`, [company_id]);
                    data = escalations.rows;
                    break;
                default:
                    data = { message: 'Report generated', parameters };
            }
            // Generate PDF
            const fileName = `${report_id}.pdf`;
            const publicPath = path_1.default.join(__dirname, '../../public/reports');
            if (!fs_1.default.existsSync(publicPath)) {
                fs_1.default.mkdirSync(publicPath, { recursive: true });
            }
            const filePath = path_1.default.join(publicPath, fileName);
            const fileUrl = `/reports/${fileName}`;
            const doc = new pdfkit_1.default();
            const writeStream = fs_1.default.createWriteStream(filePath);
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
            await new Promise((resolve, reject) => {
                writeStream.on('finish', () => resolve());
                writeStream.on('error', (err) => reject(err));
            });
            await (0, database_1.query)(`UPDATE reports SET status = 'completed', file_url = $1, completed_at = NOW() WHERE id = $2`, [fileUrl, report_id]);
            await eventBus_1.eventBus.emitEvent(eventBus_1.EVENTS.REPORT_COMPLETED, { report_id, company_id, type, file_url: fileUrl });
            logger_1.default.info(`Report ${report_id} completed successfully as PDF`);
            return { success: true, file_url: fileUrl };
        }
        catch (err) {
            logger_1.default.error(`Report ${report_id} failed`, err);
            await (0, database_1.query)(`UPDATE reports SET status = 'failed', error_message = $1 WHERE id = $2`, [err instanceof Error ? err.message : 'Unknown error', report_id]);
            throw err;
        }
    }, { connection: redis_1.redisConnection, concurrency: 3 });
    worker.on('completed', (job) => logger_1.default.info(`Report job ${job.id} completed`));
    worker.on('failed', (job, err) => logger_1.default.error(`Report job ${job?.id} failed`, err));
    return worker;
}
//# sourceMappingURL=report.worker.js.map