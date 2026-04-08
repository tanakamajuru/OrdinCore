"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSuperAdmin = exports.requireMinRole = exports.requireRole = void 0;
const ROLE_HIERARCHY = {
    SUPER_ADMIN: 100,
    ADMIN: 95,
    DIRECTOR: 90,
    RESPONSIBLE_INDIVIDUAL: 80,
    REGISTERED_MANAGER: 60,
    TEAM_LEADER: 40,
};
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Not authenticated', errors: [] });
            return;
        }
        const userRole = req.user.role?.toUpperCase();
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
exports.requireRole = requireRole;
const requireMinRole = (minRole) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Not authenticated', errors: [] });
            return;
        }
        const userRole = req.user.role?.toUpperCase();
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
exports.requireMinRole = requireMinRole;
const isSuperAdmin = (req) => {
    return req.user?.role?.toUpperCase() === 'SUPER_ADMIN';
};
exports.isSuperAdmin = isSuperAdmin;
//# sourceMappingURL=role.middleware.js.map