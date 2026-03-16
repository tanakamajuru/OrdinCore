import { Request, Response } from 'express';
export declare class RolesController {
    findAll(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    createRole(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getRolePermissions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    addRolePermission(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    removeRolePermission(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
export declare const rolesController: RolesController;
//# sourceMappingURL=roles.controller.d.ts.map