"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.housesRepo = void 0;
const database_1 = require("../config/database");
const uuid_1 = require("uuid");
exports.housesRepo = {
    async findById(id, company_id) {
        const params = [id];
        let sql = 'SELECT * FROM houses WHERE id = $1';
        if (company_id) {
            sql += ' AND company_id = $2';
            params.push(company_id);
        }
        const result = await (0, database_1.query)(sql, params);
        return result.rows[0] || null;
    },
    async findByCompany(company_id, limit = 50, offset = 0) {
        const result = await (0, database_1.query)(`SELECT h.*, u.first_name AS manager_first_name, u.last_name AS manager_last_name
       FROM houses h
       LEFT JOIN users u ON u.id = h.manager_id
       WHERE h.company_id = $1
       ORDER BY h.name
       LIMIT $2 OFFSET $3`, [company_id, limit, offset]);
        return result.rows;
    },
    async countByCompany(company_id) {
        const result = await (0, database_1.query)('SELECT COUNT(*) FROM houses WHERE company_id = $1', [company_id]);
        return parseInt(result.rows[0].count);
    },
    async create(dto) {
        const id = (0, uuid_1.v4)();
        const result = await (0, database_1.query)(`INSERT INTO houses (id, company_id, name, address, postcode, city, capacity, manager_id, registration_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`, [id, dto.company_id, dto.name, dto.address || null, dto.postcode || null, dto.city || null,
            dto.capacity || 0, dto.manager_id || null, dto.registration_number || null]);
        return result.rows[0];
    },
    async update(id, company_id, data) {
        const allowed = ['name', 'address', 'postcode', 'city', 'capacity', 'manager_id', 'status', 'registration_number'];
        const filteredData = {};
        for (const key of allowed) {
            if (key in data)
                filteredData[key] = data[key];
        }
        const fields = Object.keys(filteredData).map((k, i) => `${k} = $${i + 3}`).join(', ');
        const values = Object.values(filteredData);
        const result = await (0, database_1.query)(`UPDATE houses SET ${fields}, updated_at = NOW() WHERE id = $1 AND company_id = $2 RETURNING *`, [id, company_id, ...values]);
        return result.rows[0];
    },
    async delete(id, company_id) {
        await (0, database_1.query)("UPDATE houses SET status = 'closed', updated_at = NOW() WHERE id = $1 AND company_id = $2", [id, company_id]);
    },
    async getUsers(house_id, company_id) {
        const result = await (0, database_1.query)(`SELECT u.id, u.email, u.first_name, u.last_name, u.role, uh.role_in_house, uh.assigned_at
       FROM user_houses uh
       JOIN users u ON u.id = uh.user_id
       WHERE uh.house_id = $1 AND uh.company_id = $2 AND u.status = 'active'
       ORDER BY u.first_name`, [house_id, company_id]);
        return result.rows;
    },
    async assignStaff(house_id, company_id, user_id, role_in_house) {
        const result = await (0, database_1.query)(`INSERT INTO user_houses (user_id, house_id, company_id, role_in_house)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, house_id) DO UPDATE SET role_in_house = $4
       RETURNING *`, [user_id, house_id, company_id, role_in_house || null]);
        return result.rows[0];
    },
    async removeStaff(house_id, company_id, user_id) {
        await (0, database_1.query)(`DELETE FROM user_houses WHERE house_id = $1 AND company_id = $2 AND user_id = $3`, [house_id, company_id, user_id]);
    },
    async getSettings(house_id, company_id) {
        const result = await (0, database_1.query)(`SELECT * FROM house_settings WHERE house_id = $1 LIMIT 1`, [house_id]);
        // If no settings exist yet, return a default template
        if (result.rows.length === 0) {
            return { house_id, company_id, notification_preferences: {}, default_escalation_paths: {} };
        }
        return result.rows[0];
    },
    async updateSettings(house_id, company_id, settings) {
        const result = await (0, database_1.query)(`INSERT INTO house_settings (house_id, settings)
       VALUES ($1, $2)
       ON CONFLICT (house_id) DO UPDATE SET settings = $2, updated_at = NOW()
       RETURNING *`, [house_id, JSON.stringify(settings || {})]);
        return result.rows[0];
    }
};
//# sourceMappingURL=houses.repo.js.map