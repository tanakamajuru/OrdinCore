export declare class SystemService {
    getSettings(group_name?: string): Promise<any[]>;
    updateSettings(updates: Array<{
        key: string;
        value: string;
    }>, updated_by: string): Promise<any[]>;
    getAuditLogs(page?: number, limit?: number, filters?: {}): Promise<{
        logs: any[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    getJobLogs(page?: number, limit?: number): Promise<{
        logs: any[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
}
export declare const systemService: SystemService;
//# sourceMappingURL=system.service.d.ts.map