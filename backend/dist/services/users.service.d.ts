export declare class UsersService {
    create(company_id: string, data: {
        email: string;
        password: string;
        first_name: string;
        last_name: string;
        role: string;
        phone?: string;
        job_title?: string;
        is_active?: boolean;
        house_id?: string;
        house_ids?: string[];
        pulse_days?: string[];
    }): Promise<any>;
    findAll(company_id: string, page?: number, limit?: number, role?: string, status?: string): Promise<{
        users: any[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    findById(id: string, company_id?: string | null): Promise<any>;
    update(id: string, company_id: string | null, data: Partial<{
        first_name: string;
        last_name: string;
        role: string;
        status: string;
        is_active: boolean;
        house_id: string;
        house_ids: string[];
        pulse_days: string[];
    }>): Promise<any>;
    delete(id: string, company_id: string): Promise<void>;
    assignToHouse(userId: string, houseId: string, company_id: string, roleInHouse?: string): Promise<any>;
    getHouses(userId: string, company_id: string): Promise<any[]>;
    getPermissions(userId: string, company_id: string): Promise<any[]>;
    getRoles(userId: string, company_id: string): Promise<any[]>;
    assignRole(userId: string, company_id: string, roleName: string): Promise<any>;
    suspend(userId: string, company_id: string): Promise<any>;
    activate(userId: string, company_id: string): Promise<any>;
    resetPassword(userId: string, company_id: string, passwordString: string): Promise<void>;
    search(company_id: string, queryStr: string, page?: number, limit?: number): Promise<{
        users: any[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
}
export declare const usersService: UsersService;
//# sourceMappingURL=users.service.d.ts.map