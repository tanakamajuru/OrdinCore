export declare class CompanyService {
    create(data: {
        name: string;
        domain?: string;
        plan?: string;
        email?: string;
        phone?: string;
        address?: string;
    }): Promise<any>;
    findAll(limit?: number, offset?: number): Promise<{
        companies: any[];
        total: number;
    }>;
    findById(id: string): Promise<any>;
    update(id: string, data: Partial<{
        name: string;
        domain: string;
        status: string;
        plan: string;
        email: string;
        phone: string;
        address: string;
    }>): Promise<any>;
    delete(id: string): Promise<void>;
}
export declare const companyService: CompanyService;
//# sourceMappingURL=company.service.d.ts.map