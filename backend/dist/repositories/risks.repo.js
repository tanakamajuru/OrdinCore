"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.risksRepo = void 0;
const database_1 = require("../config/database");
const uuid_1 = require("uuid");
exports.risksRepo = {
    async findById(id, company_id) {
        const params = [id];
        let sql = `SELECT r.*, 
        rc.name AS category_name,
        u1.first_name || ' ' || u1.last_name AS created_by_name,
        u2.first_name || ' ' || u2.last_name AS assigned_to_name,
        h.name AS house_name
      FROM risks r
      LEFT JOIN risk_categories rc ON rc.id = r.category_id
      LEFT JOIN users u1 ON u1.id = r.created_by
      LEFT JOIN users u2 ON u2.id = r.assigned_to
      LEFT JOIN houses h ON h.id = r.house_id
      WHERE r.id = $1`;
        if (company_id) {
            sql += ' AND r.company_id = $2';
            params.push(company_id);
        }
        const result = await (0, database_1.query)(sql, params);
        return result.rows[0] || null;
    },
    async findByCompany(company_id, filters = {}, limit = 50, offset = 0) {
        const conditions = ['r.company_id = $1'];
        const params = [company_id];
        let idx = 2;
        if (filters.status) {
            conditions.push(`r.status = $${idx++}`);
            params.push(filters.status);
        }
        if (filters.severity) {
            conditions.push(`r.severity = $${idx++}`);
            params.push(filters.severity);
        }
        if (filters.house_id) {
            conditions.push(`r.house_id = $${idx++}`);
            params.push(filters.house_id);
        }
        if (filters.assigned_to) {
            conditions.push(`r.assigned_to = $${idx++}`);
            params.push(filters.assigned_to);
        }
        const where = conditions.join(' AND ');
        const result = await (0, database_1.query)(`SELECT r.*, rc.name AS category_name, h.name AS house_name,
        u.first_name || ' ' || u.last_name AS assigned_to_name
       FROM risks r
       LEFT JOIN risk_categories rc ON rc.id = r.category_id
       LEFT JOIN houses h ON h.id = r.house_id
       LEFT JOIN users u ON u.id = r.assigned_to
       WHERE ${where}
       ORDER BY r.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`, params);
        return result.rows;
    },
    async countByCompany(company_id, filters = {}) {
        const conditions = ['company_id = $1'];
        const params = [company_id];
        let idx = 2;
        if (filters.status) {
            conditions.push(`status = $${idx++}`);
            params.push(filters.status);
        }
        if (filters.severity) {
            conditions.push(`severity = $${idx++}`);
            params.push(filters.severity);
        }
        const result = await (0, database_1.query)(`SELECT COUNT(*) FROM risks WHERE ${conditions.join(' AND ')}`, params);
        return parseInt(result.rows[0].count);
    },
    async create(dto) {
        const id = (0, uuid_1.v4)();
        const result = await (0, database_1.query)(`INSERT INTO risks (id, company_id, house_id, category_id, title, description, severity, likelihood, impact, assigned_to, created_by, review_due_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`, [id, dto.company_id, dto.house_id, dto.category_id || null, dto.title, dto.description || null,
            dto.severity || 'medium', dto.likelihood || null, dto.impact || null,
            dto.assigned_to || null, dto.created_by, dto.review_due_date || null]);
        return result.rows[0];
    },
    async update(id, company_id, data) {
        const allowed = ['title', 'description', 'severity', 'status', 'likelihood', 'impact', 'assigned_to', 'category_id', 'review_due_date', 'resolved_at'];
        const filteredData = {};
        for (const key of allowed) {
            if (key in data)
                filteredData[key] = data[key];
        }
        const fields = Object.keys(filteredData).map((k, i) => `${k} = $${i + 3}`).join(', ');
        const values = Object.values(filteredData);
        const result = await (0, database_1.query)(`UPDATE risks SET ${fields}, updated_at = NOW() WHERE id = $1 AND company_id = $2 RETURNING *`, [id, company_id, ...values]);
        return result.rows[0];
    },
    async delete(id, company_id) {
        await (0, database_1.query)("UPDATE risks SET status = 'closed', updated_at = NOW() WHERE id = $1 AND company_id = $2", [id, company_id]);
    },
    async addEvent(risk_id, company_id, event_type, description, created_by) {
        const id = (0, uuid_1.v4)();
        const result = await (0, database_1.query)(`INSERT INTO risk_events (id, risk_id, company_id, event_type, description, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [id, risk_id, company_id, event_type, description, created_by]);
        return result.rows[0];
    },
    async addAction(risk_id, company_id, data) {
        const id = (0, uuid_1.v4)();
        const result = await (0, database_1.query)(`INSERT INTO risk_actions (id, risk_id, company_id, title, description, assigned_to, due_date, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [id, risk_id, company_id, data.title, data.description || null, data.assigned_to || null, data.due_date || null, data.created_by]);
        return result.rows[0];
    },
    async getActions(risk_id, company_id) {
        const result = await (0, database_1.query)(`SELECT ra.*, u.first_name || ' ' || u.last_name AS created_by_name
       FROM risk_actions ra
       JOIN users u ON u.id = ra.created_by
       WHERE ra.risk_id = $1 AND ra.company_id = $2
       ORDER BY ra.created_at DESC`, [risk_id, company_id]);
        return result.rows;
    },
    async getTimeline(risk_id, company_id) {
        const result = await (0, database_1.query)(`SELECT re.*, u.first_name || ' ' || u.last_name AS created_by_name
       FROM risk_events re
       JOIN users u ON u.id = re.created_by
       WHERE re.risk_id = $1 AND re.company_id = $2
       ORDER BY re.created_at DESC`, [risk_id, company_id]);
        return result.rows;
    },
    async getCategories(company_id) {
        const result = await (0, database_1.query)(`SELECT * FROM risk_categories WHERE company_id = $1 ORDER BY name`, [company_id]);
        return result.rows;
    },
    async createCategory(company_id, data) {
        const id = (0, uuid_1.v4)();
        const result = await (0, database_1.query)(`INSERT INTO risk_categories (id, company_id, name, description, color, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [id, company_id, data.name, data.description || null, data.color || '#cccccc', data.created_by]);
        return result.rows[0];
    },
    async getAttachments(risk_id, company_id) {
        const result = await (0, database_1.query)(`SELECT a.*, u.first_name || ' ' || u.last_name AS uploaded_by_name
       FROM risk_attachments a
       JOIN users u ON u.id = a.uploaded_by
       WHERE a.risk_id = $1 AND a.company_id = $2
       ORDER BY a.created_at DESC`, [risk_id, company_id]);
        return result.rows;
    },
    async addAttachment(risk_id, company_id, data) {
        const id = (0, uuid_1.v4)();
        const result = await (0, database_1.query)(`INSERT INTO risk_attachments (id, risk_id, company_id, file_name, file_url, file_type, file_size, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [id, risk_id, company_id, data.file_name, data.file_url, data.file_type || null, data.file_size || 0, data.uploaded_by]);
        return result.rows[0];
    },
    async removeAttachment(attachment_id, risk_id, company_id) {
        await (0, database_1.query)(`DELETE FROM risk_attachments WHERE id = $1 AND risk_id = $2 AND company_id = $3`, [attachment_id, risk_id, company_id]);
    },
    async assignRisk(risk_id, company_id, assigned_to) {
        const result = await (0, database_1.query)(`UPDATE risks SET assigned_to = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3 RETURNING *`, [assigned_to, risk_id, company_id]);
        return result.rows[0];
    },
    async updateStatus(risk_id, company_id, status) {
        const result = await (0, database_1.query)(`UPDATE risks SET status = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3 RETURNING *`, [status, risk_id, company_id]);
        return result.rows[0];
    }
};
//# sourceMappingURL=risks.repo.js.map