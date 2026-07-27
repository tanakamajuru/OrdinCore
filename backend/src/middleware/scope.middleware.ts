import { Request, Response, NextFunction } from 'express';

const ROLE_LEVELS: Record<string, number> = {
  SUPER_ADMIN: 100,
  ADMIN: 95,
  DIRECTOR: 90,
  RESPONSIBLE_INDIVIDUAL: 80,
  REGISTERED_MANAGER: 60,
  TEAM_LEADER: 40,
  SUPPORT_WORKER: 30,
};

/**
 * Scope enforcement middleware.
 * Ensures RM/TL can only access data for their assigned house.
 */
export const requireScope = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Not authenticated', errors: [] });
    return;
  }

  const userRole = req.user.role?.toUpperCase() || '';
  const userLevel = ROLE_LEVELS[userRole] || 0;

  // The Registered Manager oversees the WHOLE registered service — every house in the company —
  // which is the entire premise of the cross-house / systemic pattern, promotion and daily
  // sign-off features. Scoping the RM to a single assigned house (and 403-ing every write when
  // that list is empty) broke sign-off and promotion. RM and above therefore get company-wide
  // scope; company_id isolation still confines them to their own organisation. Only the Team
  // Leader and Support Worker — who work inside one house — remain house-restricted.
  if (userLevel >= ROLE_LEVELS.REGISTERED_MANAGER) {
    next();
    return;
  }

  // TL and SW are restricted to their OWN_SERVICE (assigned_house)
  const userHouseIds = req.user.assigned_house_ids || [];
  
  if (userHouseIds.length === 0) {
    // If it's a GET request, we allow it to proceed but it will likely return empty results
    // because of company_id isolation. This prevents the "Blue Circle" dashboard hang.
    if (req.method === 'GET') {
      console.warn(`User ${req.user.user_id} (${userRole}) has no house assignments but is performing a GET request.`);
      next();
      return;
    }

    res.status(403).json({
      success: false,
      message: 'Access denied: No house assigned to this user profile. Please contact your company administrator.',
      errors: [],
    });
    return;
  }

  // Check if house_id is provided in query, params, or body and if it matches
  const requestedHouseId = 
    req.params.houseId || 
    req.query.house_id || 
    (req.body as Record<string, unknown>)?.house_id;

  if (requestedHouseId && typeof requestedHouseId === 'string' && !userHouseIds.includes(requestedHouseId)) {
    res.status(404).json({
      success: false,
      message: 'Not found or not authorized for this site',
      errors: [],
    });
    return;
  }

  // Force house_id filter for GET requests if not specified
  if (req.method === 'GET' && !req.query.house_id && !req.params.houseId) {
    if (userHouseIds.length === 1) {
      req.query.house_id = userHouseIds[0];
    }
  }
  
  // Force house_id for POST/PUT if not specified
  if ((req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') && !req.body.house_id) {
    if (userHouseIds.length === 1) {
      req.body.house_id = userHouseIds[0];
    }
  }

  next();
};
