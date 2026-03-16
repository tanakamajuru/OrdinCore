"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyService = exports.CompanyService = void 0;
const database_1 = require("../config/database");
const uuid_1 = require("uuid");
class CompanyService {
    async create(data) {
        const id = (0, uuid_1.v4)();
        const result = await (0, database_1.query)(`INSERT INTO companies (id, name, domain, plan, email, phone, address)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [id, data.name, data.domain || null, data.plan || 'starter', data.email || null, data.phone || null, data.address || null]);
        return result.rows[0];
    }
    async findAll(limit = 50, offset = 0) {
        const result = await (0, database_1.query)(`SELECT c.*, 
        (SELECT COUNT(*) FROM users WHERE company_id = c.id) AS user_count,
        (SELECT COUNT(*) FROM houses WHERE company_id = c.id) AS house_count
       FROM companies c ORDER BY c.created_at DESC LIMIT $1 OFFSET $2`, [limit, offset]);
        const total = await (0, database_1.query)('SELECT COUNT(*) FROM companies');
        return { companies: result.rows, total: parseInt(total.rows[0].count) };
    }
    async findById(id) {
        const result = await (0, database_1.query)(`SELECT c.*,
        (SELECT COUNT(*) FROM users WHERE company_id = c.id) AS user_count,
        (SELECT COUNT(*) FROM houses WHERE company_id = c.id) AS house_count
       FROM companies c WHERE c.id = $1`, [id]);
        return result.rows[0] || null;
    }
    async update(id, data) {
        const allowed = ['name', 'domain', 'status', 'plan', 'email', 'phone', 'address', 'logo_url'];
        const filteredData = {};
        for (const key of allowed) {
            if (key in data)
                filteredData[key] = data[key];
        }
        const fields = Object.keys(filteredData).map((k, i) => `${k} = $${i + 2}`).join(', ');
        const values = Object.values(filteredData);
        const result = await (0, database_1.query)(`UPDATE companies SET ${fields}, updated_at = NOW() WHERE id = $1 RETURNING *`, [id, ...values]);
        return result.rows[0];
    }
    async delete(id) {
        await (0, database_1.query)("UPDATE companies SET status = 'suspended', updated_at = NOW() WHERE id = $1", [id]);
    }
}
exports.CompanyService = CompanyService;
exports.companyService = new CompanyService();
//# sourceMappingURL=company.service.js.map