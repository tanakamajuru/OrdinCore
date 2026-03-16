"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersController = exports.UsersController = void 0;
const users_service_1 = require("../services/users.service");
class UsersController {
    async create(req, res) {
        try {
            const company_id = req.user.role === 'SUPER_ADMIN' ? req.body.company_id : req.user.company_id;
            const user = await users_service_1.usersService.create(company_id, req.body);
            return res.status(201).json({ success: true, data: user, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create user';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async findAll(req, res) {
        try {
            const company_id = req.user.company_id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const result = await users_service_1.usersService.findAll(company_id, page, limit);
            return res.json({ success: true, data: result.users, meta: { total: result.total, page: result.page, limit: result.limit, pages: result.pages } });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch users';
            return res.status(500).json({ success: false, message, errors: [] });
        }
    }
    async findById(req, res) {
        try {
            const company_id = req.user.company_id;
            const user = await users_service_1.usersService.findById(req.params.id, company_id);
            return res.json({ success: true, data: user, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'User not found';
            return res.status(404).json({ success: false, message, errors: [] });
        }
    }
    async update(req, res) {
        try {
            const company_id = req.user.company_id;
            const user = await users_service_1.usersService.update(req.params.id, company_id, req.body);
            return res.json({ success: true, data: user, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update user';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async delete(req, res) {
        try {
            const company_id = req.user.company_id;
            await users_service_1.usersService.delete(req.params.id, company_id);
            return res.json({ success: true, data: { message: 'User deactivated' }, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete user';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async assignHouse(req, res) {
        try {
            const company_id = req.user.company_id;
            const { house_id, role_in_house } = req.body;
            const result = await users_service_1.usersService.assignToHouse(req.params.id, house_id, company_id, role_in_house);
            return res.json({ success: true, data: result, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to assign house';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async getPermissions(req, res) {
        try {
            const company_id = req.user.company_id;
            const result = await users_service_1.usersService.getPermissions(req.params.id, company_id);
            return res.json({ success: true, data: result, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get permissions';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async getHouses(req, res) {
        try {
            const company_id = req.user.company_id;
            const result = await users_service_1.usersService.getHouses(req.params.id, company_id);
            return res.json({ success: true, data: result, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get assigned houses';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async getRoles(req, res) {
        try {
            const company_id = req.user.company_id;
            const result = await users_service_1.usersService.getRoles(req.params.id, company_id);
            return res.json({ success: true, data: result, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get roles';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async assignRole(req, res) {
        try {
            const company_id = req.user.company_id;
            const result = await users_service_1.usersService.assignRole(req.params.id, company_id, req.body.role);
            return res.json({ success: true, data: result, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to assign role';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async suspend(req, res) {
        try {
            const company_id = req.user.company_id;
            const result = await users_service_1.usersService.suspend(req.params.id, company_id);
            return res.json({ success: true, data: result, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to suspend user';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async activate(req, res) {
        try {
            const company_id = req.user.company_id;
            const result = await users_service_1.usersService.activate(req.params.id, company_id);
            return res.json({ success: true, data: result, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to activate user';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async search(req, res) {
        try {
            const company_id = req.user.company_id;
            const queryStr = req.query.q;
            if (!queryStr)
                return res.json({ success: true, data: [], meta: { total: 0 } });
            const result = await users_service_1.usersService.search(company_id, queryStr, parseInt(req.query.page) || 1, parseInt(req.query.limit) || 50);
            return res.json({ success: true, data: result.users, meta: { total: result.total, page: result.page, limit: result.limit, pages: result.pages } });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to search users';
            return res.status(500).json({ success: false, message, errors: [] });
        }
    }
    async getSessions(req, res) {
        try {
            return res.json({ success: true, data: [], meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get sessions';
            return res.status(500).json({ success: false, message, errors: [] });
        }
    }
    async revokeSessions(req, res) {
        try {
            return res.json({ success: true, data: { message: 'Sessions revoked' }, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to revoke sessions';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
}
exports.UsersController = UsersController;
exports.usersController = new UsersController();
//# sourceMappingURL=users.controller.js.map