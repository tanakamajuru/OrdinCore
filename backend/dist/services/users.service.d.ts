export declare class UsersService {
    create(company_id: string, data: {
        email: string;
        password: string;
        first_name: string;
        last_name: string;
        role: string;
        phone?: string;
        job_title?: string;
    }): Promise<any>;
    findAll(company_id: string, page?: number, limit?: number): Promise<{
        users: any[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    findById(id: string, company_id: string): Promise<any>;
    update(id: string, company_id: string, data: Partial<{
        first_name: string;
        last_name: string;
        role: string;
        status: string;
    }>): Promise<any>;
    delete(id: string, company_id: string): Promise<void>;
    assignToHouse(userId: string, houseId: string, company_id: string, roleInHouse?: string): Promise<any>;
    getHouses(userId: string, company_id: string): Promise<any[]>;
    getPermissions(userId: string, company_id: string): Promise<any[]>;
    getRoles(userId: string, company_id: string): Promise<any[]>;
    assignRole(userId: string, company_id: string, roleName: string): Promise<any>;
    suspend(userId: string, company_id: string): Promise<any>;
    activate(userId: string, company_id: string): Promise<any>;
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