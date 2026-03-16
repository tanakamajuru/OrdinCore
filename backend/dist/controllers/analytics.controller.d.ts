import { Request, Response } from 'express';
export declare class AnalyticsController {
    riskTrends(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    sitePerformance(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    governanceCompliance(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    escalationRate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    dashboard(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
export declare const analyticsController: AnalyticsController;
//# sourceMappingURL=analytics.controller.d.ts.map