import { Request, Response } from 'express';
export declare class ReportsController {
    request(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    findAll(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    findById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    download(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
export declare const reportsController: ReportsController;
//# sourceMappingURL=reports.controller.d.ts.map