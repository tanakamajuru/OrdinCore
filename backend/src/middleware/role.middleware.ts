import { Request, Response, NextFunction } from 'express';

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'DIRECTOR' | 'RESPONSIBLE_INDIVIDUAL' | 'REGISTERED_MANAGER' | 'TEAM_LEADER';

const ROLE_HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN: 100,
  ADMIN: 95,
  DIRECTOR: 90,
  RESPONSIBLE_INDIVIDUAL: 80,
  REGISTERED_MANAGER: 60,
  TEAM_LEADER: 40,
};

export const requireRole = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated', errors: [] });
      return;
    }

    const userRole = req.user.role?.toUpperCase() as Role;

    if (!roles.includes(userRole)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(', ')}`,
        errors: [],
      });
      return;
    }

    next();
  };
};

export const requireMinRole = (minRole: Role) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated', errors: [] });
      return;
    }

    const userRole = req.user.role?.toUpperCase() as Role;
    const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
    const minLevel = ROLE_HIERARCHY[minRole] ?? 0;

    if (userLevel < minLevel) {
      res.status(403).json({
        success: false,
        message: `Access denied. Minimum role required: ${minRole}`,
        errors: [],
      });
      return;
    }

    next();
  };
};

export const isSuperAdmin = (req: Request): boolean => {
  return req.user?.role?.toUpperCase() === 'SUPER_ADMIN';
};
