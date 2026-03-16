"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rolesService = exports.RolesService = void 0;
const roles_repo_1 = require("../repositories/roles.repo");
class RolesService {
    async findAll(company_id) {
        return roles_repo_1.rolesRepo.findAll(company_id);
    }
    async createRole(company_id, name, description) {
        // Only allow custom roles per company
        return roles_repo_1.rolesRepo.createRole(company_id, name, description, false);
    }
    async getRolePermissions(role_id) {
        return roles_repo_1.rolesRepo.getRolePermissions(role_id);
    }
    async addRolePermission(role_id, permission_id) {
        await roles_repo_1.rolesRepo.addRolePermission(role_id, permission_id);
        return { message: 'Permission added to role successfully' };
    }
    async removeRolePermission(role_id, permission_id) {
        await roles_repo_1.rolesRepo.removeRolePermission(role_id, permission_id);
        return { message: 'Permission removed from role successfully' };
    }
}
exports.RolesService = RolesService;
exports.rolesService = new RolesService();
//# sourceMappingURL=roles.service.js.map