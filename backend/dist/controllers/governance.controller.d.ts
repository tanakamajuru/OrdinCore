import { Request, Response } from 'express';
export declare class GovernanceController {
    createTemplate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getTemplates(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    createPulse(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getPulses(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getPulseById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    submitAnswers(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getTemplateQuestions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    addTemplateQuestion(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateTemplateQuestion(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    removeTemplateQuestion(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getPulseAnswers(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updatePulseStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
export declare const governanceController: GovernanceController;
//# sourceMappingURL=governance.controller.d.ts.map