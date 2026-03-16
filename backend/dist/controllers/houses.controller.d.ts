import { Request, Response } from 'express';
export declare class HousesController {
    create(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    findAll(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    findById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    update(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    delete(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getStaff(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    assignStaff(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    removeStaff(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getSettings(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateSettings(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getRisks(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getIncidents(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getGovernancePulses(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getMetricsOverview(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getMapLocations(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
export declare const housesController: HousesController;
//# sourceMappingURL=houses.controller.d.ts.map