import { Request, Response, NextFunction } from 'express';
type Role = 'SUPER_ADMIN' | 'ADMIN' | 'REGISTERED_MANAGER' | 'RESPONSIBLE_INDIVIDUAL' | 'DIRECTOR';
export declare const requireRole: (...roles: Role[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const requireMinRole: (minRole: Role) => (req: Request, res: Response, next: NextFunction) => void;
export declare const isSuperAdmin: (req: Request) => boolean;
export {};
//# sourceMappingURL=role.middleware.d.ts.map