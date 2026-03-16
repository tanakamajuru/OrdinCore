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
        // Verify user still exists and is active
        const result = await (0, database_1.query)('SELECT id, company_id, email, role, status FROM users WHERE id = $1', [decoded.user_id]);
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
            company_id: decoded.company_id,
            role: decoded.role,
            email: decoded.email,
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