import { Request, Response, NextFunction } from 'express';

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'DIRECTOR' | 'RESPONSIBLE_INDIVIDUAL' | 'REGISTERED_MANAGER' | 'TEAM_LEADER' | 'SUPPORT_WORKER';

const ROLE_HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN: 100,
  ADMIN: 95,
  DIRECTOR: 90,
  RESPONSIBLE_INDIVIDUAL: 80,
  REGISTERED_MANAGER: 60,
  TEAM_LEADER: 40,
  // Frontline staff who capture signals and action tasks — most restricted, house-scoped.
  SUPPORT_WORKER: 30,
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

// §7 — the Responsible Individual is an INDEPENDENT oversight role. While acting as the RI
// they may see everything but must not perform operational governance actions (complete daily
// governance, record decisions, own/close escalations, close patterns or risks) — otherwise
// oversight and execution collapse into one person. Because RI outranks RM in the hierarchy,
// requireMinRole alone would wrongly allow this, so operational write routes add this guard.
// An RI who genuinely holds an operational role switches their active capacity (active_role)
// to it (e.g. Registered Manager); req.user.role then reflects that and the guard passes.
export const blockOversightRole = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Not authenticated', errors: [] });
    return;
  }
  if (req.user.role?.toUpperCase() === 'RESPONSIBLE_INDIVIDUAL') {
    res.status(403).json({
      success: false,
      code: 'OVERSIGHT_READONLY',
      message: 'As Responsible Individual you have independent oversight only. Switch your active role to an operational role (e.g. Registered Manager) to perform this action.',
      errors: [],
    });
    return;
  }
  next();
};

export const isSuperAdmin = (req: Request): boolean => {
  return req.user?.role?.toUpperCase() === 'SUPER_ADMIN';
};
