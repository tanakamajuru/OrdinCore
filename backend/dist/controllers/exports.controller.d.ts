import { Request, Response } from 'express';
export declare class ExportsController {
    private handleExportRequest;
    exportRisks(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    exportIncidents(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    exportGovernance(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    exportUsers(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    exportHouses(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
export declare const exportsController: ExportsController;
//# sourceMappingURL=exports.controller.d.ts.map