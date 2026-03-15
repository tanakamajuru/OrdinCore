import { Request, Response } from 'express';
import { housesService } from '../services/houses.service';

export class HousesController {
  async create(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const house = await housesService.create(company_id, req.body);
      return res.status(201).json({ success: true, data: house, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create house';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const result = await housesService.findAll(company_id, page, limit);
      return res.json({ success: true, data: result.houses, meta: { total: result.total, page, limit, pages: result.pages } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch houses';
      return res.status(500).json({ success: false, message, errors: [] });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const house = await housesService.findById(req.params.id, company_id);
      return res.json({ success: true, data: house, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'House not found';
      return res.status(404).json({ success: false, message, errors: [] });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const house = await housesService.update(req.params.id, company_id, req.body);
      return res.json({ success: true, data: house, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update house';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      await housesService.delete(req.params.id, company_id);
      return res.json({ success: true, data: { message: 'House closed' }, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete house';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }
}

export const housesController = new HousesController();
