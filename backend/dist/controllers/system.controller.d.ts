import { Request, Response } from 'express';
export declare class SystemController {
    getSettings(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateSettings(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getAuditLogs(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getJobLogs(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
export declare const systemController: SystemController;
//# sourceMappingURL=system.controller.d.ts.map