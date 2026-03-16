import { Request, Response } from 'express';
export declare class NotificationsController {
    findAll(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    markRead(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    markAllRead(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getPreferences(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updatePreferences(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
export declare const notificationsController: NotificationsController;
//# sourceMappingURL=notifications.controller.d.ts.map