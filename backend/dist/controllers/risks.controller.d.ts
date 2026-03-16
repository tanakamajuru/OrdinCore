import { Request, Response } from 'express';
export declare class RisksController {
    create(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    findAll(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    findById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    update(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    delete(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    addEvent(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    addAction(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getActions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    escalate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getTimeline(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getCategories(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    createCategory(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getAttachments(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    addAttachment(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    removeAttachment(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    assignRisk(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getAssignedToMe(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getMetricsSummary(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    bulkReassign(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
export declare const risksController: RisksController;
//# sourceMappingURL=risks.controller.d.ts.map