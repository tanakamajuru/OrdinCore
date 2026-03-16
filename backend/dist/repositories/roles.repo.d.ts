export declare const rolesRepo: {
    findAll(company_id: string): Promise<any[]>;
    createRole(company_id: string, name: string, description: string, is_system?: boolean): Promise<any>;
    getRolePermissions(role_id: string): Promise<any[]>;
    addRolePermission(role_id: string, permission_id: string): Promise<void>;
    removeRolePermission(role_id: string, permission_id: string): Promise<void>;
};
//# sourceMappingURL=roles.repo.d.ts.map