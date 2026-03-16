import { Request, Response } from 'express';
export declare class IncidentsController {
    create(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    findAll(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    findById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    update(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    delete(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getTimeline(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getGovernanceTimeline(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getCategories(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    createCategory(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getAttachments(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    addAttachment(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    removeAttachment(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    assignIncident(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    resolveIncident(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    bulkResolve(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
export declare const incidentsController: IncidentsController;
//# sourceMappingURL=incidents.controller.d.ts.map