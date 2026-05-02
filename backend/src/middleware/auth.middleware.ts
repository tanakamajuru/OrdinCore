import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';
import logger from '../utils/logger';

export interface JwtPayload {
  user_id: string;
  company_id: string | null;
  role: string;
  email: string;
  assigned_house_id?: string | null; // Legacy
  house_ids?: string[];
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

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'No token provided', errors: [] });
      return;
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'fallback-secret';

    const decoded = jwt.verify(token, secret) as JwtPayload;

    // Verify user still exists and is active, and fetch assigned houses
    const result = await query(
      `SELECT u.id, u.company_id, u.email, u.role, u.status, 
              ARRAY_AGG(DISTINCT COALESCE(uh.house_id, h_direct.id)) FILTER (WHERE COALESCE(uh.house_id, h_direct.id) IS NOT NULL) AS house_ids
       FROM users u
       LEFT JOIN user_houses uh ON uh.user_id = u.id
       LEFT JOIN houses h_direct ON h_direct.manager_id = u.id
       WHERE u.id = $1
       GROUP BY u.id`,
      [decoded.user_id]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ success: false, message: 'User not found', errors: [] });
      return;
    }

    const user = result.rows[0];
    if (user.status !== 'active') {
      res.status(401).json({ success: false, message: 'Account is inactive', errors: [] });
      return;
    }

    let finalHouseIds = user.house_ids || [];
    if (finalHouseIds.length === 0 && (user.role === 'RESPONSIBLE_INDIVIDUAL' || user.role === 'DIRECTOR' || user.role === 'SUPER_ADMIN')) {
      const allHouses = await query('SELECT id FROM houses WHERE company_id = $1 AND status != $2', [user.company_id, 'closed']);
      finalHouseIds = allHouses.rows.map(h => h.id);
    }

    req.user = {
      user_id: decoded.user_id,
      company_id: user.company_id,
      role: user.role,
      email: user.email,
      house_ids: finalHouseIds,
      assigned_house_id: finalHouseIds.length > 0 ? finalHouseIds[0] : null,
    };

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, message: 'Token expired', errors: [] });
      return;
    }
    if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, message: 'Invalid token', errors: [] });
      return;
    }
    logger.error('Auth middleware error', err);
    res.status(500).json({ success: false, message: 'Internal server error', errors: [] });
  }
};
