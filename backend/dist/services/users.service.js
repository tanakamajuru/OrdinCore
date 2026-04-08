"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersService = exports.UsersService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const users_repo_1 = require("../repositories/users.repo");
const houses_repo_1 = require("../repositories/houses.repo");
class UsersService {
    async create(company_id, data) {
        const existing = await users_repo_1.usersRepo.findByEmail(data.email);
        if (existing)
            throw new Error('Email already in use');
        const password_hash = await bcryptjs_1.default.hash(data.password, 12);
        const status = data.is_active === false ? 'inactive' : 'active';
        const user = await users_repo_1.usersRepo.create({ company_id, email: data.email, password_hash, first_name: data.first_name, last_name: data.last_name, role: data.role, status, pulse_days: data.pulse_days });
        await users_repo_1.usersRepo.createProfile(user.id, { phone: data.phone, job_title: data.job_title });
        // Handle house assignment
        if (data.house_ids && Array.isArray(data.house_ids)) {
            for (const hId of data.house_ids) {
                await users_repo_1.usersRepo.assignToHouse(user.id, hId, company_id);
            }
        }
        else if (data.house_id) {
            if (data.house_id === 'all') {
                const houses = await houses_repo_1.housesRepo.findByCompany(company_id, {}, 1000, 0);
                for (const h of houses) {
                    await users_repo_1.usersRepo.assignToHouse(user.id, h.id, company_id);
                }
            }
            else {
                await houses_repo_1.housesRepo.update(data.house_id, company_id, { manager_id: user.id });
                await users_repo_1.usersRepo.assignToHouse(user.id, data.house_id, company_id);
            }
        }
        const { password_hash: _, ...safeUser } = user;
        void _;
        return safeUser;
    }
    async findAll(company_id, page = 1, limit = 50, role, status) {
        const offset = (page - 1) * limit;
        const [users, total] = await Promise.all([
            users_repo_1.usersRepo.findByCompany(company_id, limit, offset, role, status),
            users_repo_1.usersRepo.countByCompany(company_id, role, status),
        ]);
        return { users: users.map(({ password_hash, ...u }) => { void password_hash; return u; }), total, page, limit, pages: Math.ceil(total / limit) };
    }
    async findById(id, company_id) {
        const user = await users_repo_1.usersRepo.findById(id, company_id);
        if (!user)
            throw new Error('User not found');
        return user;
    }
    async update(id, company_id, data) {
        const user = await users_repo_1.usersRepo.findById(id, company_id);
        if (!user)
            throw new Error('User not found');
        // Map is_active to status if provided
        if (data.is_active !== undefined) {
            data.status = data.is_active ? 'active' : 'inactive';
        }
        // Handle house update
        if (('house_id' in data || 'house_ids' in data) && company_id) {
            await users_repo_1.usersRepo.clearAssignedHouses(id);
            if (data.house_ids && Array.isArray(data.house_ids)) {
                for (const hId of data.house_ids) {
                    await users_repo_1.usersRepo.assignToHouse(id, hId, company_id);
                }
            }
            else if (data.house_id) {
                if (data.house_id === 'all') {
                    const houses = await houses_repo_1.housesRepo.findByCompany(company_id, {}, 1000, 0);
                    for (const h of houses) {
                        await users_repo_1.usersRepo.assignToHouse(id, h.id, company_id);
                    }
                }
                else {
                    const role = (data.role || user.role).toUpperCase();
                    if (['REGISTERED_MANAGER', 'RM'].includes(role)) {
                        await houses_repo_1.housesRepo.update(data.house_id, company_id, { manager_id: id });
                    }
                    await users_repo_1.usersRepo.assignToHouse(id, data.house_id, company_id);
                }
            }
        }
        const { house_id: _, house_ids: __, is_active: ___, ...updateData } = data;
        void _;
        void __;
        void ___;
        const updated = await users_repo_1.usersRepo.update(id, updateData);
        const { password_hash, ...safe } = updated;
        void password_hash;
        return safe;
    }
    async delete(id, company_id) {
        const user = await users_repo_1.usersRepo.findById(id);
        if (!user || user.company_id !== company_id)
            throw new Error('User not found');
        await users_repo_1.usersRepo.delete(id);
    }
    async assignToHouse(userId, houseId, company_id, roleInHouse) {
        return users_repo_1.usersRepo.assignToHouse(userId, houseId, company_id, roleInHouse);
    }
    async getHouses(userId, company_id) {
        const user = await users_repo_1.usersRepo.findById(userId);
        if (!user || user.company_id !== company_id)
            throw new Error('User not found');
        return users_repo_1.usersRepo.getHouses(userId);
    }
    async getPermissions(userId, company_id) {
        const user = await users_repo_1.usersRepo.findById(userId);
        if (!user || user.company_id !== company_id)
            throw new Error('User not found');
        return users_repo_1.usersRepo.getPermissions(userId);
    }
    async getRoles(userId, company_id) {
        const user = await users_repo_1.usersRepo.findById(userId);
        if (!user || user.company_id !== company_id)
            throw new Error('User not found');
        return users_repo_1.usersRepo.getRoleDetails(userId);
    }
    async assignRole(userId, company_id, roleName) {
        const user = await users_repo_1.usersRepo.findById(userId);
        if (!user || user.company_id !== company_id)
            throw new Error('User not found');
        return users_repo_1.usersRepo.assignRole(userId, roleName);
    }
    async suspend(userId, company_id) {
        const user = await users_repo_1.usersRepo.findById(userId);
        if (!user || user.company_id !== company_id)
            throw new Error('User not found');
        return users_repo_1.usersRepo.updateStatus(userId, 'suspended');
    }
    async activate(userId, company_id) {
        const user = await users_repo_1.usersRepo.findById(userId);
        if (!user || user.company_id !== company_id)
            throw new Error('User not found');
        return users_repo_1.usersRepo.updateStatus(userId, 'active');
    }
    async resetPassword(userId, company_id, passwordString) {
        const user = await users_repo_1.usersRepo.findById(userId);
        if (!user || user.company_id !== company_id)
            throw new Error('User not found');
        const password_hash = await bcryptjs_1.default.hash(passwordString, 12);
        await users_repo_1.usersRepo.update(userId, { password_hash });
    }
    async search(company_id, queryStr, page = 1, limit = 50) {
        const offset = (page - 1) * limit;
        // Basic search filtering implemented in service level for simplicity on top of existing findByCompany
        const [users, total] = await Promise.all([
            users_repo_1.usersRepo.findByCompany(company_id, 1000, 0), // fetch all and sort in memory (or add search to repo)
            users_repo_1.usersRepo.countByCompany(company_id)
        ]);
        queryStr = queryStr.toLowerCase();
        const filtered = users.filter(u => u.first_name.toLowerCase().includes(queryStr) ||
            u.last_name.toLowerCase().includes(queryStr) ||
            u.email.toLowerCase().includes(queryStr));
        const paginated = filtered.slice(offset, offset + limit);
        return {
            users: paginated.map(({ password_hash, ...u }) => { void password_hash; return u; }),
            total: filtered.length,
            page,
            limit,
            pages: Math.ceil(filtered.length / limit)
        };
    }
}
exports.UsersService = UsersService;
exports.usersService = new UsersService();
//# sourceMappingURL=users.service.js.map