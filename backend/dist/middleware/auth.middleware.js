"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../config/database");
const logger_1 = __importDefault(require("../utils/logger"));
const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ success: false, message: 'No token provided', errors: [] });
            return;
        }
        const token = authHeader.split(' ')[1];
        const secret = process.env.JWT_SECRET || 'fallback-secret';
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        // Verify user still exists and is active, and fetch assigned houses
        const result = await (0, database_1.query)(`SELECT u.id, u.company_id, u.email, u.role, u.status, 
              ARRAY_AGG(DISTINCT COALESCE(uh.house_id, h_direct.id)) FILTER (WHERE COALESCE(uh.house_id, h_direct.id) IS NOT NULL) AS house_ids
       FROM users u
       LEFT JOIN user_houses uh ON uh.user_id = u.id
       LEFT JOIN houses h_direct ON h_direct.manager_id = u.id
       WHERE u.id = $1
       GROUP BY u.id`, [decoded.user_id]);
        if (result.rows.length === 0) {
            res.status(401).json({ success: false, message: 'User not found', errors: [] });
            return;
        }
        const user = result.rows[0];
        if (user.status !== 'active') {
            res.status(401).json({ success: false, message: 'Account is inactive', errors: [] });
            return;
        }
        req.user = {
            user_id: decoded.user_id,
            company_id: user.company_id,
            role: user.role,
            email: user.email,
            house_ids: user.house_ids || [],
            assigned_house_id: user.house_ids && user.house_ids.length > 0 ? user.house_ids[0] : null,
        };
        next();
    }
    catch (err) {
        if (err instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json({ success: false, message: 'Token expired', errors: [] });
            return;
        }
        if (err instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({ success: false, message: 'Invalid token', errors: [] });
            return;
        }
        logger_1.default.error('Auth middleware error', err);
        res.status(500).json({ success: false, message: 'Internal server error', errors: [] });
    }
};
exports.requireAuth = requireAuth;
//# sourceMappingURL=auth.middleware.js.map