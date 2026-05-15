import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { usersRepo } from '../repositories/users.repo';
import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { governanceService } from './governance.service';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-fallback';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

export class AuthService {
  private validatePassword(password: string) {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasLetter || !hasNumber) {
      throw new Error('Password must contain at least one letter and one number');
    }
  }

  async login(email: string, password: string) {
    const user = await usersRepo.findByEmail(email);
    if (!user) throw new Error('Invalid credentials');
    if (user.status !== 'active') throw new Error('Account is inactive or suspended');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new Error('Invalid credentials');

    // Update last login
    await usersRepo.update(user.id, { last_login: new Date() });

    // Trigger pulse generation on login
    const houseRoles = ['REGISTERED_MANAGER', 'RM', 'TEAM_LEADER', 'TL'];
    if (user.company_id) {
      const houseId = user.assigned_house_id;
      if (houseRoles.includes(user.role.toUpperCase()) && houseId) {
        // Targeted generation for the user's house
        void governanceService.generateMissingPulses(user.company_id, houseId, user.id).catch(err => {
          console.error(`Failed to generate pulses for house ${houseId}:`, err);
        });
      } else {
        // General generation for the company
        void governanceService.generateMissingPulses(user.company_id).catch(err => {
          console.error('Failed to generate missing pulses on login:', err);
        });
      }
    }

    const profile = await query('SELECT * FROM user_profiles WHERE user_id = $1', [user.id]);
    const assignedHouses = await usersRepo.getHouses(user.id);
    const token = this.generateToken(user);
    const refreshToken = this.generateRefreshToken(user);

    const { password_hash, ...safeUser } = user;
    void password_hash;
    return { 
      token, 
      refreshToken, 
      user: {
        ...safeUser,
        profile: profile.rows[0] || null,
        assigned_house_ids: assignedHouses.map(h => h.id),
        assigned_house_id: assignedHouses.length > 0 ? assignedHouses[0].id : (user.assigned_house_id || null)
      } 
    };
  }

  async me(userId: string) {
    const user = await usersRepo.findById(userId);
    if (!user) throw new Error('User not found');
    
    let company_name = null;
    if (user.company_id) {
      const comp = await query('SELECT name FROM companies WHERE id = $1', [user.company_id]);
      company_name = comp.rows[0]?.name || null;
    }

    const profile = await query('SELECT * FROM user_profiles WHERE user_id = $1', [userId]);
    const assignedHouses = await usersRepo.getHouses(userId);
    const { password_hash, ...safeUser } = user;
    void password_hash;
    return { 
      ...safeUser, 
      company_name, 
      profile: profile.rows[0] || null,
      assigned_house_id: user.assigned_house_id,
      assigned_house_name: user.assigned_house_name,
      assigned_house_ids: assignedHouses.map(h => h.id)
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await usersRepo.findById(userId);
    if (!user) throw new Error('User not found');

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) throw new Error('Current password is incorrect');

    this.validatePassword(newPassword);
    const hash = await bcrypt.hash(newPassword, 12);
    await usersRepo.update(userId, { password_hash: hash });
    return { message: 'Password changed successfully' };
  }

  async resetToDefault(email: string) {
    const user = await usersRepo.findByEmail(email);
    if (!user) throw new Error('User not found');
    const hash = await bcrypt.hash('Default123!', 12); // Use a string that passes validation (mixed case + number)
    await usersRepo.update(user.id, { password_hash: hash } as any);
  }

  async refreshToken(token: string) {
    let payload: { user_id: string };
    try {
      payload = jwt.verify(token, JWT_REFRESH_SECRET) as { user_id: string };
    } catch {
      throw new Error('Invalid or expired refresh token');
    }
    const user = await usersRepo.findById(payload.user_id);
    if (!user) throw new Error('User not found');
    if (user.status !== 'active') throw new Error('Account is inactive or suspended');
    const newToken = this.generateToken(user);
    return { token: newToken };
  }

  generateToken(user: { id: string; company_id: string | null; role: string; email: string }) {
    return jwt.sign(
      { user_id: user.id, company_id: user.company_id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );
  }

  generateRefreshToken(user: { id: string }) {
    return jwt.sign({ user_id: user.id }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions);
  }

  async logAudit(company_id: string | null, user_id: string, action: string, resource: string, resource_id?: string) {
    await query(
      `INSERT INTO audit_logs (id, company_id, user_id, action, resource, resource_id) VALUES ($1,$2,$3,$4,$5,$6)`,
      [uuidv4(), company_id, user_id, action, resource, resource_id || null]
    );
  }

  async updateProfile(userId: string, data: { first_name?: string; last_name?: string; avatar_url?: string }) {
    if (data.first_name || data.last_name) {
      await usersRepo.update(userId, { 
        first_name: data.first_name, 
        last_name: data.last_name 
      } as any);
    }
    if (data.avatar_url !== undefined) {
      await query(
        `INSERT INTO user_profiles (user_id, avatar_url) VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET avatar_url = $2, updated_at = NOW()`,
        [userId, data.avatar_url]
      );
    }
    return this.me(userId);
  }
}

export const authService = new AuthService();
