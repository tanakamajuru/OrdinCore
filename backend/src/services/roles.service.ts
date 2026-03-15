import { rolesRepo } from '../repositories/roles.repo';

export class RolesService {
  async findAll(company_id: string) {
    return rolesRepo.findAll(company_id);
  }

  async createRole(company_id: string, name: string, description: string) {
    // Only allow custom roles per company
    return rolesRepo.createRole(company_id, name, description, false);
  }

  async getRolePermissions(role_id: string) {
    return rolesRepo.getRolePermissions(role_id);
  }

  async addRolePermission(role_id: string, permission_id: string) {
    await rolesRepo.addRolePermission(role_id, permission_id);
    return { message: 'Permission added to role successfully' };
  }

  async removeRolePermission(role_id: string, permission_id: string) {
    await rolesRepo.removeRolePermission(role_id, permission_id);
    return { message: 'Permission removed from role successfully' };
  }
}

export const rolesService = new RolesService();
