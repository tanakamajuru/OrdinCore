export declare class AnalyticsService {
    getRiskTrends(company_id: string, days?: number): Promise<{
        trends: any[];
        by_status: any[];
    }>;
    getMultiHouseRiskTrends(company_id: string, days?: number): Promise<{
        trends: any[];
        houses: any[];
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
    getTrends(company_id: string): Promise<{
        crossHouseRisk: {
            trends: any[];
            houses: any[];
        };
        safeGuarding: {
            trends: {
                week: string;
                incidents: number;
            }[];
            currentWeek: number;
            total: number;
            average: number;
        };
        escalation: {
            trends: {
                week: string;
                count: number;
            }[];
            currentWeek: number;
            total: number;
            average: number;
        };
    }>;
}
export declare const analyticsService: AnalyticsService;
//# sourceMappingURL=analytics.service.d.ts.map