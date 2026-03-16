"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemRepo = void 0;
const database_1 = require("../config/database");
exports.systemRepo = {
    async getSettings(group_name) {
        const params = [];
        let sql = `SELECT * FROM system_settings`;
        if (group_name) {
            sql += ` WHERE setting_group = $1`;
            params.push(group_name);
        }
        sql += ` ORDER BY setting_group, setting_key`;
        const result = await (0, database_1.query)(sql, params);
        return result.rows;
    },
    async updateSetting(setting_key, setting_value, updated_by) {
        const result = await (0, database_1.query)(`UPDATE system_settings 
       SET setting_value = $1, updated_at = NOW(), updated_by = $2
       WHERE setting_key = $3 RETURNING *`, [setting_value, updated_by, setting_key]);
        return result.rows[0];
    },
    async getAuditLogs(page = 1, limit = 50, filters = {}) {
        const offset = (page - 1) * limit;
        const conditions = [];
        const params = [];
        let idx = 1;
        if (filters.event_type) {
            conditions.push(`event_type = $${idx++}`);
            params.push(filters.event_type);
        }
        if (filters.date_from) {
            conditions.push(`created_at >= $${idx++}`);
            params.push(filters.date_from);
        }
        if (filters.date_to) {
            conditions.push(`created_at <= $${idx++}`);
            params.push(filters.date_to);
        }
        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const [logs, countResult] = await Promise.all([
            (0, database_1.query)(`SELECT * FROM system_events ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`, [...params, limit, offset]),
            (0, database_1.query)(`SELECT COUNT(*) FROM system_events ${where}`, params),
        ]);
        return {
            logs: logs.rows,
            total: parseInt(countResult.rows[0].count),
            page,
            limit,
            pages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
        };
    },
    async getJobLogs(page = 1, limit = 50) {
        const offset = (page - 1) * limit;
        // Assuming a background_jobs or similar table, adapting to whatever structure we might have. 
        // Fallback to system_events for now if a specific jobs table is missing in schema,
        // but the prompt implies a job tracking mechanism. Let's assume a generic jobs querying logic.
        // If not, we will just return system events filtered by "job" type.
        const [logs, countResult] = await Promise.all([
            (0, database_1.query)(`SELECT * FROM system_events WHERE event_type LIKE '%job%' ORDER BY created_at DESC LIMIT $1 OFFSET $2`, [limit, offset]),
            (0, database_1.query)(`SELECT COUNT(*) FROM system_events WHERE event_type LIKE '%job%'`),
        ]);
        return {
            logs: logs.rows,
            total: parseInt(countResult.rows[0].count),
            page,
            limit,
            pages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
        };
    }
};
//# sourceMappingURL=system.repo.js.map