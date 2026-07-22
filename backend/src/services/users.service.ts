import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { usersRepo } from '../repositories/users.repo';
import { housesRepo } from '../repositories/houses.repo';
import { authService } from './auth.service';

export class UsersService {
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

  async create(company_id: string, data: {
    email: string; password: string; first_name: string; last_name: string; role: string; phone?: string; job_title?: string;
    is_active?: boolean;
    house_id?: string;
    house_ids?: string[];
    pulse_days?: string[];
  }) {
    if (data.role) {
      data.role = data.role.toUpperCase().replace(/-/g, '_');
    }
    const existing = await usersRepo.findByEmail(data.email);
    if (existing) throw new Error('Email already in use');

    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL', 'REGISTERED_MANAGER', 'TEAM_LEADER', 'SUPPORT_WORKER'];
    if (!allowedRoles.includes(data.role.toUpperCase())) {
      throw new Error(`Invalid role: ${data.role}`);
    }

    this.validatePassword(data.password);
    const password_hash = await bcrypt.hash(data.password, 12);
    const status = data.is_active === false ? 'inactive' : 'active';
    const user = await usersRepo.create({ company_id, email: data.email, password_hash, first_name: data.first_name, last_name: data.last_name, role: data.role, status, pulse_days: data.pulse_days });
    await usersRepo.createProfile(user.id, { phone: data.phone, job_title: data.job_title });

    // Handle house assignment
    if (data.house_ids && Array.isArray(data.house_ids)) {
      for (const hId of data.house_ids) {
        await usersRepo.assignToHouse(user.id, hId, company_id);
        const role = data.role.toUpperCase();
        if (['REGISTERED_MANAGER', 'RM'].includes(role)) {
          await housesRepo.update(hId, company_id, { manager_id: user.id } as any);
        }
      }
    } else if (data.house_id) {
      if (data.house_id === 'all') {
        const houses = await housesRepo.findByCompany(company_id, {}, 1000, 0);
        for (const h of houses) {
          await usersRepo.assignToHouse(user.id, h.id, company_id);
        }
      } else {
        const role = data.role.toUpperCase();
        if (['REGISTERED_MANAGER', 'RM'].includes(role)) {
          await housesRepo.update(data.house_id, company_id, { manager_id: user.id } as any);
        }
        await usersRepo.assignToHouse(user.id, data.house_id, company_id);
      }
    }

    // Onboarding: email the new user a secure link to set their own password,
    // so an admin never has to communicate a password manually. Best-effort.
    void authService.sendAccountSetupEmail(user.id).catch(err =>
      console.error('Failed to send account setup email:', err));

    const { password_hash: _, ...safeUser } = user;
    void _;
    return safeUser;
  }

  async findAll(company_id: string | null, page = 1, limit = 50, role?: string, status?: string) {
    const offset = (page - 1) * limit;
    
    // Normalize filters
    const normalizedRole = role && role !== 'all' ? role.toUpperCase() : undefined;
    const normalizedStatus = status && status !== 'all' ? status.toLowerCase() : undefined;

    const [users, total] = await Promise.all([
      usersRepo.findByCompany(company_id, limit, offset, normalizedRole, normalizedStatus),
      usersRepo.countByCompany(company_id, normalizedRole, normalizedStatus),
    ]);
    return { users: users.map(({ password_hash, ...u }) => { void password_hash; return u; }), total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findById(id: string, company_id?: string | null) {
    const user = await usersRepo.findById(id, company_id);
    if (!user) throw new Error('User not found');
    return user;
  }

  async update(id: string, company_id: string | null, data: Partial<{ first_name: string; last_name: string; role: string; status: string; is_active: boolean; house_id: string; house_ids: string[]; pulse_days: string[] }>) {
    if (data.role) {
      data.role = data.role.toUpperCase().replace(/-/g, '_');
    }
    const user = await usersRepo.findById(id, company_id);
    if (!user) throw new Error('User not found');
    
    // Map is_active to status if provided
    if (data.is_active !== undefined) {
      data.status = data.is_active ? 'active' : 'inactive';
    }

    // Handle house update
    if (('house_id' in data || 'house_ids' in data)) {
      await usersRepo.clearAssignedHouses(id);
      
      const targetCompanyId = company_id || user.company_id;
      if (!targetCompanyId) throw new Error('Company Context Missing');

      if (data.house_ids && Array.isArray(data.house_ids)) {
         for (const hId of data.house_ids) {
            await usersRepo.assignToHouse(id, hId, targetCompanyId);
            const role = (data.role || user.role).toUpperCase();
            if (['REGISTERED_MANAGER', 'RM'].includes(role)) {
              await housesRepo.update(hId, targetCompanyId, { manager_id: id } as any);
            }
         }
      } else if (data.house_id) {
        if (data.house_id === 'all') {
          const houses = await housesRepo.findByCompany(targetCompanyId, {}, 1000, 0);
          for (const h of houses) {
            await usersRepo.assignToHouse(id, h.id, targetCompanyId);
          }
        } else {
          const role = (data.role || user.role).toUpperCase();
          if (['REGISTERED_MANAGER', 'RM'].includes(role)) {
            await housesRepo.update(data.house_id, targetCompanyId, { manager_id: id } as any);
          }
          await usersRepo.assignToHouse(id, data.house_id, targetCompanyId);
        }
      }
    }

    const { house_id: _, house_ids: __, is_active: ___, ...updateData } = data;
    void _; void __; void ___;

    if (Object.keys(updateData).length === 0) {
      const { password_hash, ...safe } = user;
      void password_hash;
      return safe;
    }

    const updated = await usersRepo.update(id, updateData);
    const { password_hash, ...safe } = updated;
    void password_hash;
    return safe;
  }

  async delete(id: string, company_id: string | null) {
    const user = await usersRepo.findById(id);
    if (!user || (company_id && user.company_id !== company_id)) throw new Error('User not found');
    
    const protectedEmails = [
      'superadmin1@ordincore.co.uk',
      'superadmin2@ordincore.co.uk',
      'superadmin3@ordincore.co.uk',
      'superadmin4@ordincore.co.uk'
    ];
    if (protectedEmails.includes(user.email)) {
      throw new Error('Cannot delete default superadmin account');
    }

    await usersRepo.delete(id);
  }

  async assignToHouse(userId: string, houseId: string, company_id: string, roleInHouse?: string) {
    return usersRepo.assignToHouse(userId, houseId, company_id, roleInHouse);
  }

  async getHouses(userId: string, company_id: string) {
    const user = await usersRepo.findById(userId);
    if (!user || user.company_id !== company_id) throw new Error('User not found');
    return usersRepo.getHouses(userId);
  }

  async getPermissions(userId: string, company_id: string) {
    const user = await usersRepo.findById(userId);
    if (!user || user.company_id !== company_id) throw new Error('User not found');
    return usersRepo.getPermissions(userId);
  }

  async getRoles(userId: string, company_id: string) {
    const user = await usersRepo.findById(userId);
    if (!user || user.company_id !== company_id) throw new Error('User not found');
    return usersRepo.getRoleDetails(userId);
  }

  async assignRole(userId: string, company_id: string, roleName: string) {
    const user = await usersRepo.findById(userId);
    if (!user || user.company_id !== company_id) throw new Error('User not found');
    return usersRepo.assignRole(userId, roleName);
  }

  async suspend(userId: string, company_id: string | null) {
    const user = await usersRepo.findById(userId);
    if (!user || (company_id && user.company_id !== company_id)) throw new Error('User not found');
    return usersRepo.updateStatus(userId, 'inactive');
  }

  async activate(userId: string, company_id: string | null) {
    const user = await usersRepo.findById(userId);
    if (!user || (company_id && user.company_id !== company_id)) throw new Error('User not found');
    return usersRepo.updateStatus(userId, 'active');
  }

  async resetPassword(userId: string, company_id: string | null, passwordString: string) {
    const user = await usersRepo.findById(userId, company_id);
    if (!user) throw new Error('User not found');
    
    this.validatePassword(passwordString);
    const password_hash = await bcrypt.hash(passwordString, 12);
    await usersRepo.update(userId, { password_hash } as any);
  }

  // Multi-role grants: set the full set of roles a user may act as, with one marked
  // primary (users.role). Admin-guarded, audited, and protects against stripping a
  // user's last role or self-granting SUPER_ADMIN.
  async setUserRoles(company_id: string, targetUserId: string, roles: string[], primary: string, actingUserId: string, actingRole: string) {
    const allowed = ['SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL', 'REGISTERED_MANAGER', 'TEAM_LEADER', 'SUPPORT_WORKER'];
    const norm = Array.from(new Set((roles || []).map(r => String(r).toUpperCase().replace(/-/g, '_')))).filter(r => allowed.includes(r));
    const primaryRole = String(primary || norm[0] || '').toUpperCase().replace(/-/g, '_');

    if (norm.length === 0) throw new Error('A user must keep at least one role.');
    if (!norm.includes(primaryRole)) throw new Error('The primary role must be one of the granted roles.');

    const u = await usersRepo.findById(targetUserId, company_id);
    if (!u || u.company_id !== company_id) throw new Error('User not found');

    // Only a SUPER_ADMIN may grant SUPER_ADMIN, and nobody can self-grant it.
    if (norm.includes('SUPER_ADMIN') && (actingRole !== 'SUPER_ADMIN' || targetUserId === actingUserId)) {
      throw new Error('You cannot grant the SUPER_ADMIN role.');
    }

    const current = (await query('SELECT role FROM user_roles WHERE user_id = $1', [targetUserId])).rows.map((r: any) => r.role);
    const toAdd = norm.filter(r => !current.includes(r));
    const toRemove = current.filter((r: string) => !norm.includes(r));

    for (const r of toAdd) {
      await query(
        `INSERT INTO user_roles (user_id, company_id, role, granted_by) VALUES ($1,$2,$3,$4)
         ON CONFLICT (user_id, role) DO NOTHING`,
        [targetUserId, company_id, r, actingUserId]
      );
      await this.auditRole(company_id, actingUserId, 'ROLE_GRANTED', targetUserId, r);
    }
    for (const r of toRemove) {
      await query('DELETE FROM user_roles WHERE user_id = $1 AND role = $2', [targetUserId, r]);
      await this.auditRole(company_id, actingUserId, 'ROLE_REVOKED', targetUserId, r);
    }

    // Primary role is users.role; if the active role is no longer held, reset to primary.
    await query(
      `UPDATE users SET role = $1,
              active_role = CASE WHEN active_role = ANY($2::text[]) THEN active_role ELSE $1 END,
              updated_at = NOW()
        WHERE id = $3`,
      [primaryRole, norm, targetUserId]
    );

    return { id: targetUserId, roles: norm, primary: primaryRole };
  }

  private async auditRole(company_id: string, actor: string, action: string, target: string, role: string) {
    await query(
      `INSERT INTO audit_logs (id, company_id, user_id, action, resource, resource_id, new_values)
       VALUES ($1,$2,$3,$4,'user',$5,$6)`,
      [uuidv4(), company_id, actor, action, target, JSON.stringify({ role })]
    );
  }

  // Site-visibility override: grant/revoke a user's ability to view signals
  // across ALL company sites. Read-scope widening only — never touches role or
  // permissions. Same-company guarded + audited (CQC: who changed access, when).
  async setViewAllHouses(company_id: string, targetUserId: string, value: boolean, actingUserId: string) {
    const u = await usersRepo.findById(targetUserId, company_id);
    if (!u || u.company_id !== company_id) throw new Error('User not found');

    await usersRepo.update(targetUserId, {
      can_view_all_houses: value,
      view_all_houses_granted_by: value ? actingUserId : null,
      view_all_houses_granted_at: value ? new Date() : null,
    } as any);

    await query(
      `INSERT INTO audit_logs (id, company_id, user_id, action, resource, resource_id, new_values)
       VALUES ($1, $2, $3, $4, 'user', $5, $6)`,
      [
        uuidv4(), company_id, actingUserId,
        value ? 'GRANT_VIEW_ALL_SITES' : 'REVOKE_VIEW_ALL_SITES',
        targetUserId, JSON.stringify({ can_view_all_houses: value }),
      ]
    );

    return { id: targetUserId, can_view_all_houses: value };
  }

  async search(company_id: string | null, queryStr: string, page = 1, limit = 50, role?: string, status?: string) {
    const offset = (page - 1) * limit;
    
    // Normalize filters
    const normalizedRole = role && role !== 'all' ? role.toUpperCase() : undefined;
    const normalizedStatus = status && status !== 'all' ? status.toLowerCase() : undefined;

    const [users] = await Promise.all([
      usersRepo.findByCompany(company_id, 1000, 0, normalizedRole, normalizedStatus),
    ]);
    
    queryStr = queryStr.toLowerCase();
    const filtered = users.filter(u => {
      const firstName = (u.first_name || '').toLowerCase();
      const lastName = (u.last_name || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim();
      const email = (u.email || '').toLowerCase();
      return firstName.includes(queryStr) || 
             lastName.includes(queryStr) || 
             email.includes(queryStr) ||
             fullName.includes(queryStr);
    });
    
    const paginated = filtered.slice(offset, offset + limit);
    return { 
      users: paginated.map(({ password_hash, ...u }) => { void password_hash; return u; }), 
      total: filtered.length, 
      page, 
      limit, 
      pages: Math.ceil(filtered.length / limit) 
    };
  }
}

export const usersService = new UsersService();
