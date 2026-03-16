import { Request, Response, NextFunction } from 'express';
/**
 * Tenant isolation middleware.
 * Injects tenant context and blocks cross-tenant access for non-super admins.
 */
export declare const requireTenant: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=tenant.middleware.d.ts.map