"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const users_repo_1 = require("../repositories/users.repo");
const database_1 = require("../config/database");
const uuid_1 = require("uuid");
const governance_service_1 = require("./governance.service");
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-fallback';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
class AuthService {
    async login(email, password) {
        const user = await users_repo_1.usersRepo.findByEmail(email);
        if (!user)
            throw new Error('Invalid credentials');
        if (user.status !== 'active')
            throw new Error('Account is inactive or suspended');
        const valid = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!valid)
            throw new Error('Invalid credentials');
        // Update last login
        await users_repo_1.usersRepo.update(user.id, { last_login: new Date() });
        // Trigger pulse generation on login
        const houseRoles = ['REGISTERED_MANAGER', 'RM', 'TEAM_LEADER', 'TL'];
        if (user.company_id) {
            const houseId = user.assigned_house_id;
            if (houseRoles.includes(user.role.toUpperCase()) && houseId) {
                // Targeted generation for the user's house
                void governance_service_1.governanceService.generateMissingPulses(user.company_id, houseId, user.id).catch(err => {
                    console.error(`Failed to generate pulses for house ${houseId}:`, err);
                });
            }
            else {
                // General generation for the company
                void governance_service_1.governanceService.generateMissingPulses(user.company_id).catch(err => {
                    console.error('Failed to generate missing pulses on login:', err);
                });
            }
        }
        const token = this.generateToken(user);
        const refreshToken = this.generateRefreshToken(user);
        const { password_hash, ...safeUser } = user;
        void password_hash;
        return { token, refreshToken, user: safeUser };
    }
    async me(userId) {
        const user = await users_repo_1.usersRepo.findById(userId);
        if (!user)
            throw new Error('User not found');
        let company_name = null;
        if (user.company_id) {
            const comp = await (0, database_1.query)('SELECT name FROM companies WHERE id = $1', [user.company_id]);
            company_name = comp.rows[0]?.name || null;
        }
        const profile = await (0, database_1.query)('SELECT * FROM user_profiles WHERE user_id = $1', [userId]);
        const { password_hash, ...safeUser } = user;
        void password_hash;
        return {
            ...safeUser,
            company_name,
            profile: profile.rows[0] || null,
            assigned_house_id: user.assigned_house_id,
            assigned_house_name: user.assigned_house_name
        };
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = await users_repo_1.usersRepo.findById(userId);
        if (!user)
            throw new Error('User not found');
        const valid = await bcryptjs_1.default.compare(currentPassword, user.password_hash);
        if (!valid)
            throw new Error('Current password is incorrect');
        const hash = await bcryptjs_1.default.hash(newPassword, 12);
        await users_repo_1.usersRepo.update(userId, { password_hash: hash });
        return { message: 'Password changed successfully' };
    }
    async resetToDefault(email) {
        const user = await users_repo_1.usersRepo.findByEmail(email);
        if (!user)
            throw new Error('User not found');
        const hash = await bcryptjs_1.default.hash('default', 12);
        await users_repo_1.usersRepo.update(user.id, { password_hash: hash });
    }
    async refreshToken(token) {
        let payload;
        try {
            payload = jsonwebtoken_1.default.verify(token, JWT_REFRESH_SECRET);
        }
        catch {
            throw new Error('Invalid or expired refresh token');
        }
        const user = await users_repo_1.usersRepo.findById(payload.user_id);
        if (!user)
            throw new Error('User not found');
        if (user.status !== 'active')
            throw new Error('Account is inactive or suspended');
        const newToken = this.generateToken(user);
        return { token: newToken };
    }
    generateToken(user) {
        return jsonwebtoken_1.default.sign({ user_id: user.id, company_id: user.company_id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    }
    generateRefreshToken(user) {
        return jsonwebtoken_1.default.sign({ user_id: user.id }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
    }
    async logAudit(company_id, user_id, action, resource, resource_id) {
        await (0, database_1.query)(`INSERT INTO audit_logs (id, company_id, user_id, action, resource, resource_id) VALUES ($1,$2,$3,$4,$5,$6)`, [(0, uuid_1.v4)(), company_id, user_id, action, resource, resource_id || null]);
    }
    async updateProfile(userId, data) {
        if (data.first_name || data.last_name) {
            await users_repo_1.usersRepo.update(userId, {
                first_name: data.first_name,
                last_name: data.last_name
            });
        }
        if (data.avatar_url !== undefined) {
            await (0, database_1.query)(`INSERT INTO user_profiles (user_id, avatar_url) VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET avatar_url = $2, updated_at = NOW()`, [userId, data.avatar_url]);
        }
        return this.me(userId);
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
//# sourceMappingURL=auth.service.js.map