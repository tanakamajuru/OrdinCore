import { Request, Response, NextFunction } from 'express';
export interface JwtPayload {
    user_id: string;
    company_id: string | null;
    role: string;
    email: string;
    iat?: number;
    exp?: number;
}
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}
export declare const requireAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auth.middleware.d.ts.map