import { Request, Response } from 'express';
import { usersService } from '../services/users.service';

export class UsersController {
  async create(req: Request, res: Response) {
    try {
      const company_id = req.user!.role === 'SUPER_ADMIN' ? req.body.company_id : req.user!.company_id!;
      const user = await usersService.create(company_id, req.body);
      return res.status(201).json({ success: true, data: user, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create user';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const result = await usersService.findAll(company_id, page, limit);
      return res.json({ success: true, data: result.users, meta: { total: result.total, page: result.page, limit: result.limit, pages: result.pages } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch users';
      return res.status(500).json({ success: false, message, errors: [] });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const user = await usersService.findById(req.params.id, company_id);
      return res.json({ success: true, data: user, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'User not found';
      return res.status(404).json({ success: false, message, errors: [] });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const user = await usersService.update(req.params.id, company_id, req.body);
      return res.json({ success: true, data: user, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update user';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      await usersService.delete(req.params.id, company_id);
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
      const company_id = req.user!.company_id!;
      const result = await usersService.suspend(req.params.id, company_id);
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to suspend user';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async activate(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const result = await usersService.activate(req.params.id, company_id);
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to activate user';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async search(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
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
      return res.json({ success: true, data: [], meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get sessions';
      return res.status(500).json({ success: false, message, errors: [] });
    }
  }

  async revokeSessions(req: Request, res: Response) {
    try {
      return res.json({ success: true, data: { message: 'Sessions revoked' }, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to revoke sessions';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }
}

export const usersController = new UsersController();
