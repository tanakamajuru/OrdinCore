export declare class ReportsService {
    requestReport(company_id: string, user_id: string, data: {
        type: string;
        name: string;
        parameters?: Record<string, unknown>;
    }): Promise<any>;
    findAll(company_id: string, page?: number, limit?: number): Promise<{
        reports: any[];
        total: number;
        page: number;
        limit: number;
    }>;
    findById(id: string, company_id: string): Promise<any>;
    getDownloadUrl(id: string, company_id: string): Promise<{
        file_url: any;
    }>;
}
export declare const reportsService: ReportsService;
//# sourceMappingURL=reports.service.d.ts.map