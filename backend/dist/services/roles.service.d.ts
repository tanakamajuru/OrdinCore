export declare class RolesService {
    findAll(company_id: string): Promise<any[]>;
    createRole(company_id: string, name: string, description: string): Promise<any>;
    getRolePermissions(role_id: string): Promise<any[]>;
    addRolePermission(role_id: string, permission_id: string): Promise<{
        message: string;
    }>;
    removeRolePermission(role_id: string, permission_id: string): Promise<{
        message: string;
    }>;
}
export declare const rolesService: RolesService;
//# sourceMappingURL=roles.service.d.ts.map