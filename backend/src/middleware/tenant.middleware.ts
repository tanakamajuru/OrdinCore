import { Request, Response, NextFunction } from 'express';

/**
 * Tenant isolation middleware.
 * Injects tenant context and blocks cross-tenant access for non-super admins.
 */
export const requireTenant = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Not authenticated', errors: [] });
    return;
  }

  // SUPER_ADMIN can pass any company_id via query params or body, otherwise block
  if (req.user.role === 'SUPER_ADMIN') {
    next();
    return;
  }

  if (!req.user.company_id) {
    res.status(403).json({
      success: false,
      message: 'No company context found. Contact your administrator.',
      errors: [],
    });
    return;
  }

  // Prevent accessing another company's data
  const requestedCompanyId =
    req.params.companyId || req.query.company_id || (req.body as Record<string, unknown>)?.company_id;

  if (requestedCompanyId && requestedCompanyId !== req.user.company_id) {
    res.status(403).json({
      success: false,
      message: 'Access denied: cross-tenant access prohibited',
      errors: [],
    });
    return;
  }

  next();
};
