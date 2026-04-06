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
      const filters = {
        search: req.query.search as string,
        is_active: req.query.is_active as string,
      };
      const result = await housesService.findAll(company_id, filters, page, limit);
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

  async getStaff(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const staff = await housesService.getStaff(req.params.id, company_id);
      return res.json({ success: true, data: staff, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch house staff';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async assignStaff(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const { user_id, role_in_house } = req.body;
      const result = await housesService.assignStaff(req.params.id, company_id, user_id, role_in_house);
      return res.status(201).json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to assign staff';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async removeStaff(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      await housesService.removeStaff(req.params.id, company_id, req.params.userId);
      return res.json({ success: true, data: { message: 'Staff removed' }, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to remove staff';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async getSettings(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const settings = await housesService.getSettings(req.params.id, company_id);
      return res.json({ success: true, data: settings, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch house settings';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async updateSettings(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const settings = await housesService.updateSettings(req.params.id, company_id, req.body);
      return res.json({ success: true, data: settings, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update house settings';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async getRisks(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const risks = await housesService.getRisks(req.params.id, company_id);
      return res.json({ success: true, data: risks, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch house risks';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async getIncidents(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const incidents = await housesService.getIncidents(req.params.id, company_id);
      return res.json({ success: true, data: incidents, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch house incidents';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async getGovernancePulses(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const pulses = await housesService.getGovernancePulses(req.params.id, company_id);
      return res.json({ success: true, data: pulses, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch house governance pulses';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async getMetricsOverview(req: Request, res: Response) {
    try {
      return res.json({ success: true, data: { active_houses: 0, total_capacity: 0 }, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch metrics overview';
      return res.status(500).json({ success: false, message, errors: [] });
    }
  }

  async getMapLocations(req: Request, res: Response) {
    try {
      return res.json({ success: true, data: [], meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch map locations';
      return res.status(500).json({ success: false, message, errors: [] });
    }
  }
}

export const housesController = new HousesController();
