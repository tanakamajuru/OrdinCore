"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportsRepo = void 0;
const database_1 = require("../config/database");
exports.exportsRepo = {
    async getRisks(company_id) {
        const result = await (0, database_1.query)(`SELECT r.id, r.title, r.status, r.severity_level, r.created_at, h.name as house_name, c.name as category_name
       FROM risks r
       LEFT JOIN houses h ON h.id = r.house_id
       LEFT JOIN risk_categories c ON c.id = r.category_id
       WHERE r.company_id = $1
       ORDER BY r.created_at DESC`, [company_id]);
        return result.rows;
    },
    async getIncidents(company_id) {
        const result = await (0, database_1.query)(`SELECT i.id, i.title, i.status, i.severity_level, i.created_at, h.name as house_name, c.name as category_name
       FROM incidents i
       LEFT JOIN houses h ON h.id = i.house_id
       LEFT JOIN incident_categories c ON c.id = i.category_id
       WHERE i.company_id = $1
       ORDER BY i.created_at DESC`, [company_id]);
        return result.rows;
    },
    async getGovernance(company_id) {
        const result = await (0, database_1.query)(`SELECT gp.id, t.name as template_name, gp.status, gp.due_date, gp.completed_at, gp.compliance_score, h.name as house_name
       FROM governance_pulses gp
       LEFT JOIN governance_templates t ON t.id = gp.template_id
       LEFT JOIN houses h ON h.id = gp.house_id
       WHERE gp.company_id = $1
       ORDER BY gp.due_date DESC`, [company_id]);
        return result.rows;
    },
    async getUsers(company_id) {
        const result = await (0, database_1.query)(`SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.status, u.created_at
       FROM users u
       WHERE u.company_id = $1
       ORDER BY u.created_at DESC`, [company_id]);
        return result.rows;
    },
    async getHouses(company_id) {
        const result = await (0, database_1.query)(`SELECT h.id, h.name, h.location, h.capacity, h.status, h.created_at
       FROM houses h
       WHERE h.company_id = $1
       ORDER BY h.name ASC`, [company_id]);
        return result.rows;
    }
};
//# sourceMappingURL=exports.repo.js.map