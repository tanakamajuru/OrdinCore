export declare const systemRepo: {
    getSettings(group_name?: string): Promise<any[]>;
    updateSetting(setting_key: string, setting_value: string, updated_by: string): Promise<any>;
    getAuditLogs(page?: number, limit?: number, filters?: {
        event_type?: string;
        date_from?: string;
        date_to?: string;
    }): Promise<{
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
};
//# sourceMappingURL=system.repo.d.ts.map