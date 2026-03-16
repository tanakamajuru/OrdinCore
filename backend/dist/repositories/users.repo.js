"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRepo = void 0;
const database_1 = require("../config/database");
const uuid_1 = require("uuid");
exports.usersRepo = {
    async findById(id) {
        const result = await (0, database_1.query)('SELECT * FROM users WHERE id = $1', [id]);
        return result.rows[0] || null;
    },
    async findByEmail(email) {
        const result = await (0, database_1.query)('SELECT * FROM users WHERE email = $1', [email]);
        return result.rows[0] || null;
    },
    async findByCompany(company_id, limit = 50, offset = 0) {
        const result = await (0, database_1.query)(`SELECT u.*, p.job_title, p.phone, p.avatar_url
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE u.company_id = $1
       ORDER BY u.created_at DESC
       LIMIT $2 OFFSET $3`, [company_id, limit, offset]);
        return result.rows;
    },
    async countByCompany(company_id) {
        const result = await (0, database_1.query)('SELECT COUNT(*) FROM users WHERE company_id = $1', [company_id]);
        return parseInt(result.rows[0].count);
    },
    async create(dto) {
        const id = (0, uuid_1.v4)();
        const result = await (0, database_1.query)(`INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`, [id, dto.company_id || null, dto.email, dto.password_hash, dto.first_name, dto.last_name, dto.role, dto.status || 'active']);
        return result.rows[0];
    },
    async update(id, data) {
        const fields = Object.keys(data).map((k, i) => `${k} = $${i + 2}`).join(', ');
        const values = Object.values(data);
        const result = await (0, database_1.query)(`UPDATE users SET ${fields}, updated_at = NOW() WHERE id = $1 RETURNING *`, [id, ...values]);
        return result.rows[0];
    },
    async delete(id) {
        await (0, database_1.query)('UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2', ['inactive', id]);
    },
    async createProfile(user_id, data) {
        const result = await (0, database_1.query)(`INSERT INTO user_profiles (user_id, phone, job_title)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET phone = $2, job_title = $3, updated_at = NOW()
       RETURNING *`, [user_id, data.phone || null, data.job_title || null]);
        return result.rows[0];
    },
    async assignToHouse(user_id, house_id, company_id, role_in_house) {
        const result = await (0, database_1.query)(`INSERT INTO user_houses (user_id, house_id, company_id, role_in_house)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, house_id) DO UPDATE SET role_in_house = $4
       RETURNING *`, [user_id, house_id, company_id, role_in_house || null]);
        return result.rows[0];
    },
    async getHouses(user_id) {
        const result = await (0, database_1.query)(`SELECT h.*, uh.role_in_house, uh.assigned_at
       FROM user_houses uh
       JOIN houses h ON h.id = uh.house_id
       WHERE uh.user_id = $1 AND h.status != 'closed'
       ORDER BY h.name`, [user_id]);
        return result.rows;
    },
    async getPermissions(user_id) {
        const result = await (0, database_1.query)(`SELECT DISTINCT p.name, p.description, p.module
       FROM users u
       JOIN role_permissions rp ON rp.role_id = (SELECT id FROM roles WHERE name = u.role LIMIT 1)
       JOIN permissions p ON p.id = rp.permission_id
       WHERE u.id = $1`, [user_id]);
        return result.rows;
    },
    async getRoleDetails(user_id) {
        const result = await (0, database_1.query)(`SELECT r.id, r.name, r.description 
        FROM users u 
        JOIN roles r ON r.name = u.role 
        WHERE u.id = $1 LIMIT 1`, [user_id]);
        return result.rows;
    },
    async assignRole(user_id, role_name) {
        const result = await (0, database_1.query)(`UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING *`, [role_name, user_id]);
        return result.rows[0];
    },
    async updateStatus(user_id, status) {
        const result = await (0, database_1.query)(`UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`, [status, user_id]);
        return result.rows[0];
    }
};
//# sourceMappingURL=users.repo.js.map