import { Request, Response, NextFunction } from 'express';

const ROLE_LEVELS: Record<string, number> = {
  SUPER_ADMIN: 100,
  ADMIN: 95,
  DIRECTOR: 90,
  RESPONSIBLE_INDIVIDUAL: 80,
  REGISTERED_MANAGER: 60,
  TEAM_LEADER: 40,
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

  // Directors and above have global organization scope
  if (userLevel >= ROLE_LEVELS.RESPONSIBLE_INDIVIDUAL) {
    next();
    return;
  }

  // RM and TL are restricted to their OWN_SERVICE (assigned_house)
  const userHouseIds = req.user.house_ids || [];
  
  if (userHouseIds.length === 0) {
    res.status(403).json({
      success: false,
      message: 'Access denied: No house assigned to this user profile.',
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
