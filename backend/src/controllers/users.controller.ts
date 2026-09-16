import { Request, Response } from 'express';
import { usersService } from '../services/users.service';
import { query } from '../config/database';

export class UsersController {
  async create(req: Request, res: Response) {
    try {
      const requestedRole = String(req.body.role || '').toUpperCase().replace(/-/g, '_');
      if (req.user!.role !== 'SUPER_ADMIN' && requestedRole === 'SUPER_ADMIN') {
        return res.status(403).json({ success: false, message: 'Company Admin cannot create a platform administrator.', errors: [] });
      }
      const company_id = req.user!.role === 'SUPER_ADMIN' ? req.body.company_id : req.user!.company_id!;
      const user = await usersService.create(company_id, req.body);
      return res.status(201).json({ success: true, data: user, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create user';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  /** Minimal staff picker for operational screens. Never returns email,
   * permissions, login/session data or another provider's users. */
  async directory(req: Request, res: Response) {
    try {
      const companyId = req.user!.company_id!;
      const wantedRole = req.query.role ? String(req.query.role).toUpperCase() : null;
      const senior = ['ADMIN', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL'].includes(req.user!.role);
      const siteIds = req.user!.assigned_house_ids || [];
      const result = await query(
        `SELECT u.id, TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')) AS name,
                u.role, ARRAY_REMOVE(ARRAY_AGG(DISTINCT uh.house_id), NULL) AS house_ids
           FROM users u LEFT JOIN user_houses uh ON uh.user_id=u.id
          WHERE u.company_id=$1 AND LOWER(COALESCE(u.status,'active'))='active'
            AND u.role<>'SUPER_ADMIN'
            AND ($2::text IS NULL OR u.role=$2 OR EXISTS
                (SELECT 1 FROM user_roles ur WHERE ur.user_id=u.id AND ur.role=$2))
          GROUP BY u.id
         HAVING ($3::boolean OR ARRAY_AGG(uh.house_id) && $4::uuid[])
          ORDER BY u.first_name, u.last_name`,
        [companyId, wantedRole, senior, siteIds]
      );
      return res.json({ success: true, data: result.rows, meta: {} });
    } catch {
      return res.status(500).json({ success: false, message: 'Failed to load eligible staff directory', errors: [] });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const company_id = req.user!.role === 'SUPER_ADMIN' ? (req.query.company_id as string || null) : req.user!.company_id!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const role = req.query.role as string;
      const search = (req.query.search || req.query.q) as string;

      let status = req.query.status as string;
      if (!status && req.query.is_active) {
        status = req.query.is_active === 'true' ? 'active' : 'inactive';
      }
      
      console.log(`[UsersController.findAll] company_id: ${company_id}, page: ${page}, limit: ${limit}, role: ${role}, status: ${status}, search: ${search}`);
      
      let result;
      if (search) {
        result = await usersService.search(company_id, search, page, limit, role, status);
      } else {
        result = await usersService.findAll(company_id, page, limit, role, status);
      }
      console.log(`[UsersController.findAll] found ${result.users.length} users (total: ${result.total})`);
      return res.json({ success: true, data: result.users, meta: { total: result.total, page: result.page, limit: result.limit, pages: result.pages } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch users';
      return res.status(500).json({ success: false, message, errors: [] });
    }
  }

  // Admin: set the full set of roles a user may act as (one marked primary).
  async setRoles(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const { roles, primary } = req.body || {};
      if (!Array.isArray(roles) || roles.length === 0) {
        return res.status(400).json({ success: false, message: 'roles[] (non-empty) is required', errors: [] });
      }
      const data = await usersService.setUserRoles(company_id, req.params.id, roles, primary, req.user!.user_id, req.user!.role);
      return res.json({ success: true, data, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update roles';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  // Admin: grant/revoke "can view all sites" for a specific user (read-scope only).
  async setSiteVisibility(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const { can_view_all_houses } = req.body || {};
      if (typeof can_view_all_houses !== 'boolean') {
        return res.status(400).json({ success: false, message: 'can_view_all_houses (boolean) is required', errors: [] });
      }
      const data = await usersService.setViewAllHouses(company_id, req.params.id, can_view_all_houses, req.user!.user_id);
      return res.json({ success: true, data, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update site visibility';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const company_id = req.user?.role === 'SUPER_ADMIN' ? null : req.user!.company_id!;
      const { id } = req.params;

      const user = await usersService.findById(id, company_id);
      return res.json({ success: true, data: user });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'User not found';
      return res.status(404).json({ success: false, message, errors: [] });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const requestedRole = String(req.body.role || '').toUpperCase().replace(/-/g, '_');
      if (req.user!.role !== 'SUPER_ADMIN' && requestedRole === 'SUPER_ADMIN') {
        return res.status(403).json({ success: false, message: 'Company Admin cannot grant platform access.', errors: [] });
      }
      const company_id = req.user?.role === 'SUPER_ADMIN' ? null : req.user!.company_id!;
      const user = await usersService.update(req.params.id, company_id!, { ...req.body, house_ids: req.body.house_ids });
      return res.json({ success: true, data: user });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update user';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async resetPassword(req: Request, res: Response) {
    try {
      const company_id = req.user?.role === 'SUPER_ADMIN' ? null : req.user!.company_id!;
      const { id } = req.params;
      await usersService.resetPassword(id, company_id!, req.body.password);
      return res.json({ success: true, message: 'Password reset successfully' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Reset password failed';
      return res.status(400).json({ success: false, message });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const company_id = req.user!.role === 'SUPER_ADMIN' ? null : req.user!.company_id!;
      await usersService.delete(req.params.id, company_id!);
      return res.json({ success: true, data: { message: 'User deactivated' }, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete user';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async assignHouse(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const { house_id, role_in_house } = req.body;
      const result = await usersService.assignToHouse(req.params.id, house_id, company_id, role_in_house);
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to assign house';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async getPermissions(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const result = await usersService.getPermissions(req.params.id, company_id);
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get permissions';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async getHouses(req: Request, res: Response) {
    try {
      if (req.params.id !== req.user!.user_id && !['ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)) {
        return res.status(403).json({ success: false, message: 'You may only view your own service assignments.', errors: [] });
      }
      const company_id = req.user!.company_id!;
      const result = await usersService.getHouses(req.params.id, company_id);
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get assigned houses';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async getRoles(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const result = await usersService.getRoles(req.params.id, company_id);
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get roles';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async assignRole(req: Request, res: Response) {
    try {
      const requestedRole = String(req.body.role || '').toUpperCase().replace(/-/g, '_');
      if (req.user!.role !== 'SUPER_ADMIN' && requestedRole === 'SUPER_ADMIN') {
        return res.status(403).json({ success: false, message: 'Company Admin cannot grant platform access.', errors: [] });
      }
      const company_id = req.user!.company_id!;
      const result = await usersService.assignRole(req.params.id, company_id, req.body.role);
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to assign role';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async suspend(req: Request, res: Response) {
    try {
      const company_id = req.user!.role === 'SUPER_ADMIN' ? null : req.user!.company_id!;
      const result = await usersService.suspend(req.params.id, company_id);
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to suspend user';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async activate(req: Request, res: Response) {
    try {
      const company_id = req.user!.role === 'SUPER_ADMIN' ? null : req.user!.company_id!;
      const result = await usersService.activate(req.params.id, company_id);
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to activate user';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async search(req: Request, res: Response) {
    try {
      const company_id = req.user!.role === 'SUPER_ADMIN' ? (req.query.company_id as string || null) : req.user!.company_id!;
      const queryStr = req.query.q as string;
      if (!queryStr) return res.json({ success: true, data: [], meta: { total: 0 } });
      const result = await usersService.search(company_id, queryStr, parseInt(req.query.page as string) || 1, parseInt(req.query.limit as string) || 50);
      return res.json({ success: true, data: result.users, meta: { total: result.total, page: result.page, limit: result.limit, pages: result.pages } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to search users';
      return res.status(500).json({ success: false, message, errors: [] });
    }
  }

  async getSessions(req: Request, res: Response) {
    try {
      const companyId = req.user!.role === 'SUPER_ADMIN' ? null : req.user!.company_id!;
      await usersService.findById(req.params.id, companyId);
      const sessions = await query(
        `SELECT id, created_at, expires_at, revoked_at,
                CASE WHEN revoked_at IS NULL AND expires_at>NOW() THEN 'active' ELSE 'ended' END AS status
           FROM refresh_tokens WHERE user_id=$1 ORDER BY created_at DESC LIMIT 25`, [req.params.id]
      );
      return res.json({ success: true, data: sessions.rows, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get sessions';
      return res.status(500).json({ success: false, message, errors: [] });
    }
  }

  async revokeSessions(req: Request, res: Response) {
    try {
      const companyId = req.user!.role === 'SUPER_ADMIN' ? null : req.user!.company_id!;
      const target = await usersService.findById(req.params.id, companyId);
      await query(`UPDATE refresh_tokens SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL`, [req.params.id]);
      await query(
        `INSERT INTO audit_logs (company_id,user_id,action,resource,resource_id,new_values)
         VALUES ($1,$2,'user.sessions_revoked','user',$3,$4)`,
        [target.company_id, req.user!.user_id, req.params.id, JSON.stringify({ target_user_id: req.params.id })]
      );
      return res.json({ success: true, data: { message: 'All active sessions revoked' }, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to revoke sessions';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }
}

export const usersController = new UsersController();
