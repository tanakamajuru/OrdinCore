import { Request, Response } from 'express';
export declare class UsersController {
    create(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    findAll(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    findById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    update(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    delete(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    assignHouse(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getPermissions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getHouses(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getRoles(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    assignRole(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    suspend(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    activate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    search(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getSessions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    revokeSessions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
export declare const usersController: UsersController;
//# sourceMappingURL=users.controller.d.ts.map