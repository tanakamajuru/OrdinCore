export declare class AnalyticsService {
    getRiskTrends(company_id: string, days?: number): Promise<{
        trends: any[];
        by_status: any[];
    }>;
    getSitePerformance(company_id: string): Promise<any[]>;
    getGovernanceCompliance(company_id: string, days?: number): Promise<{
        by_house: any[];
        overall: any;
    }>;
    getEscalationRate(company_id: string, days?: number): Promise<{
        trend: any[];
        summary: any;
    }>;
    getDashboardSummary(company_id: string): Promise<{
        risks: any;
        incidents: any;
        houses: any;
        governance: any;
        escalations: any;
    }>;
}
export declare const analyticsService: AnalyticsService;
//# sourceMappingURL=analytics.service.d.ts.map