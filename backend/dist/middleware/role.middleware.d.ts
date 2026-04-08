import { Request, Response, NextFunction } from 'express';
type Role = 'SUPER_ADMIN' | 'ADMIN' | 'DIRECTOR' | 'RESPONSIBLE_INDIVIDUAL' | 'REGISTERED_MANAGER' | 'TEAM_LEADER';
export declare const requireRole: (...roles: Role[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const requireMinRole: (minRole: Role) => (req: Request, res: Response, next: NextFunction) => void;
export declare const isSuperAdmin: (req: Request) => boolean;
export {};
//# sourceMappingURL=role.middleware.d.ts.map