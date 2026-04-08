export declare class HousesService {
    create(company_id: string, data: {
        name: string;
        address?: string;
        postcode?: string;
        city?: string;
        capacity?: number;
        manager_id?: string;
    }): Promise<any>;
    findAll(company_id: string, filters?: Record<string, unknown>, page?: number, limit?: number): Promise<{
        houses: any[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    findById(id: string, company_id: string): Promise<any>;
    update(id: string, company_id: string, data: object): Promise<any>;
    delete(id: string, company_id: string): Promise<void>;
    getStaff(id: string, company_id: string): Promise<any[]>;
    assignStaff(id: string, company_id: string, user_id: string, role_in_house?: string): Promise<any>;
    removeStaff(id: string, company_id: string, user_id: string): Promise<void>;
    getSettings(id: string, company_id: string): Promise<any>;
    updateSettings(id: string, company_id: string, settings: any): Promise<any>;
    getRisks(id: string, company_id: string): Promise<any[]>;
    getIncidents(id: string, company_id: string): Promise<any[]>;
    getGovernancePulses(id: string, company_id: string): Promise<any[]>;
}
export declare const housesService: HousesService;
//# sourceMappingURL=houses.service.d.ts.map