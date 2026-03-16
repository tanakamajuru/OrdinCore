export declare class ExportsService {
    exportRisks(company_id: string, format: string): Promise<{
        content: string;
        filename: string;
        contentType: string;
    }>;
    exportIncidents(company_id: string, format: string): Promise<{
        content: string;
        filename: string;
        contentType: string;
    }>;
    exportGovernance(company_id: string, format: string): Promise<{
        content: string;
        filename: string;
        contentType: string;
    }>;
    exportUsers(company_id: string, format: string): Promise<{
        content: string;
        filename: string;
        contentType: string;
    }>;
    exportHouses(company_id: string, format: string): Promise<{
        content: string;
        filename: string;
        contentType: string;
    }>;
    private formatData;
}
export declare const exportsService: ExportsService;
//# sourceMappingURL=exports.service.d.ts.map