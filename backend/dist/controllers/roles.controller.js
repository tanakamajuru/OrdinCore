"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rolesController = exports.RolesController = void 0;
const roles_service_1 = require("../services/roles.service");
class RolesController {
    async findAll(req, res) {
        try {
            const company_id = req.user.company_id;
            const roles = await roles_service_1.rolesService.findAll(company_id);
            return res.json({ success: true, data: roles, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch roles';
            return res.status(500).json({ success: false, message, errors: [] });
        }
    }
    async createRole(req, res) {
        try {
            const company_id = req.user.company_id;
            const role = await roles_service_1.rolesService.createRole(company_id, req.body.name, req.body.description);
            return res.status(201).json({ success: true, data: role, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create role';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async getRolePermissions(req, res) {
        try {
            const permissions = await roles_service_1.rolesService.getRolePermissions(req.params.id);
            return res.json({ success: true, data: permissions, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch role permissions';
            return res.status(500).json({ success: false, message, errors: [] });
        }
    }
    async addRolePermission(req, res) {
        try {
            const result = await roles_service_1.rolesService.addRolePermission(req.params.id, req.body.permission_id);
            return res.status(201).json({ success: true, data: result, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to add permission to role';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async removeRolePermission(req, res) {
        try {
            const result = await roles_service_1.rolesService.removeRolePermission(req.params.id, req.params.permissionId);
            return res.json({ success: true, data: result, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to remove permission from role';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
}
exports.RolesController = RolesController;
exports.rolesController = new RolesController();
//# sourceMappingURL=roles.controller.js.map