export declare class EscalationsService {
    findAll(company_id: string, filters?: Record<string, unknown>, page?: number, limit?: number): Promise<{
        escalations: any[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    findById(id: string, company_id: string): Promise<any>;
    resolve(id: string, company_id: string, user_id: string, resolution_notes: string): Promise<{
        message: string;
    }>;
    acknowledge(id: string, company_id: string, user_id: string): Promise<{
        message: string;
    }>;
    addAction(id: string, company_id: string, user_id: string, data: {
        action_type: string;
        description: string;
    }): Promise<any>;
    getActions(id: string, company_id: string): Promise<any[]>;
    assignEscalation(id: string, company_id: string, user_id: string, assigned_to: string): Promise<any>;
    updatePriority(id: string, company_id: string, user_id: string, priority: string): Promise<any>;
}
export declare const escalationsService: EscalationsService;
//# sourceMappingURL=escalations.service.d.ts.map