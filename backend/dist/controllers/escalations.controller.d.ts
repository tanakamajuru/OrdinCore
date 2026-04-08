import { Request, Response } from 'express';
export declare class EscalationsController {
    findAll(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    findById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    resolve(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    acknowledge(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    addAction(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getActions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    assignEscalation(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updatePriority(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getStats(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
export declare const escalationsController: EscalationsController;
//# sourceMappingURL=escalations.controller.d.ts.map