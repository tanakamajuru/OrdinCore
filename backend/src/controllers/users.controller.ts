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
}

export const usersController = new UsersController();
