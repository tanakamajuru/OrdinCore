"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportsService = exports.ReportsService = void 0;
const database_1 = require("../config/database");
const uuid_1 = require("uuid");
const bullmq_1 = require("bullmq");
const redis_1 = require("../config/redis");
const eventBus_1 = require("../events/eventBus");
const reportQueue = new bullmq_1.Queue('report_generation', { connection: redis_1.redisConnection });
class ReportsService {
    async requestReport(company_id, user_id, data) {
        const id = (0, uuid_1.v4)();
        await (0, database_1.query)(`INSERT INTO reports (id, company_id, type, name, status, generated_by, parameters)
       VALUES ($1,$2,$3,$4,'pending',$5,$6) RETURNING *`, [id, company_id, data.type, data.name, user_id, JSON.stringify(data.parameters || {})]);
        const job = await reportQueue.add('generate', { report_id: id, company_id, user_id, type: data.type, parameters: data.parameters || {} });
        await (0, database_1.query)(`INSERT INTO report_requests (id, company_id, report_id, requested_by, report_type, parameters, status, job_id)
       VALUES ($1,$2,$3,$4,$5,$6,'queued',$7)`, [(0, uuid_1.v4)(), company_id, id, user_id, data.type, JSON.stringify(data.parameters || {}), job.id]);
        await eventBus_1.eventBus.emitEvent(eventBus_1.EVENTS.REPORT_REQUESTED, { report_id: id, company_id, user_id });
        const result = await (0, database_1.query)('SELECT * FROM reports WHERE id = $1', [id]);
        return result.rows[0];
    }
    async findAll(company_id, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const [reports, countResult] = await Promise.all([
            (0, database_1.query)(`SELECT r.*, u.first_name || ' ' || u.last_name AS generated_by_name
         FROM reports r
         JOIN users u ON u.id = r.generated_by
         WHERE r.company_id = $1
         ORDER BY r.created_at DESC LIMIT ${limit} OFFSET ${offset}`, [company_id]),
            (0, database_1.query)('SELECT COUNT(*) FROM reports WHERE company_id = $1', [company_id]),
        ]);
        return { reports: reports.rows, total: parseInt(countResult.rows[0].count), page, limit };
    }
    async findById(id, company_id) {
        const result = await (0, database_1.query)('SELECT * FROM reports WHERE id = $1 AND company_id = $2', [id, company_id]);
        if (!result.rows[0])
            throw new Error('Report not found');
        return result.rows[0];
    }
    async getDownloadUrl(id, company_id) {
        const report = await this.findById(id, company_id);
        if (report.status !== 'completed')
            throw new Error('Report is not ready for download');
        if (!report.file_url)
            throw new Error('Report file not available');
        return { file_url: report.file_url };
    }
}
exports.ReportsService = ReportsService;
exports.reportsService = new ReportsService();
//# sourceMappingURL=reports.service.js.map