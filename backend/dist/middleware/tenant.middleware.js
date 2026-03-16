"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireTenant = void 0;
/**
 * Tenant isolation middleware.
 * Injects tenant context and blocks cross-tenant access for non-super admins.
 */
const requireTenant = (req, res, next) => {
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
    const requestedCompanyId = req.params.companyId || req.query.company_id || req.body?.company_id;
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
exports.requireTenant = requireTenant;
//# sourceMappingURL=tenant.middleware.js.map