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
  assigned_house_ids?: string[];
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
      `SELECT u.id, u.company_id, u.email, u.role, u.status, u.can_view_all_houses, c.status AS company_status,
              ARRAY_AGG(DISTINCT COALESCE(uh.house_id, h_direct.id)) FILTER (WHERE COALESCE(uh.house_id, h_direct.id) IS NOT NULL) AS house_ids
       FROM users u
       LEFT JOIN companies c ON c.id = u.company_id
       LEFT JOIN user_houses uh ON uh.user_id = u.id
       LEFT JOIN houses h_direct ON h_direct.manager_id = u.id
       WHERE u.id = $1
       GROUP BY u.id, c.status`,
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
    // Org-level deactivation: a suspended/archived company locks out all its users
    // (SUPER_ADMIN has no company and is exempt).
    if (user.company_id && user.company_status && user.company_status !== 'active') {
      res.status(401).json({ success: false, message: 'Organisation suspended', errors: [] });
      return;
    }

    let finalHouseIds = user.house_ids || [];
    // The user's own home house — preserved as the capture / "my house" default
    // even when read-scope is widened to all sites below.
    const homeHouseId = finalHouseIds.length > 0 ? finalHouseIds[0] : null;
    const roleSeesAll = user.role === 'RESPONSIBLE_INDIVIDUAL' || user.role === 'DIRECTOR' || user.role === 'SUPER_ADMIN';
    // An admin-granted per-user override widens read scope to all company sites
    // (e.g. a senior Team Leader covering multiple houses). Read-only widening:
    // every signal/dashboard query already filters on assigned_house_ids, so no
    // downstream query changes are needed.
    if (user.can_view_all_houses || (finalHouseIds.length === 0 && roleSeesAll)) {
      const allHouses = await query('SELECT id FROM houses WHERE company_id = $1 AND status != $2', [user.company_id, 'closed']);
      finalHouseIds = allHouses.rows.map(h => h.id);
    }

    req.user = {
      user_id: decoded.user_id,
      company_id: user.company_id,
      role: user.role,
      email: user.email,
      assigned_house_ids: finalHouseIds,
      // Capture default stays on the user's home house; falls back to first
      // visible house for role-sees-all users who have no direct assignment.
      assigned_house_id: homeHouseId || (finalHouseIds.length > 0 ? finalHouseIds[0] : null),
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
