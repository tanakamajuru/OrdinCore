import { Request, Response } from 'express';
import { directorInsightsService } from '../services/directorInsights.service';

export class DirectorInsightsController {
  async crossSiteHeatmap(req: Request, res: Response) {
    try {
      const data = await directorInsightsService.crossSiteHeatmap(req.user!.company_id!);
      return res.json({ success: true, data, meta: {} });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to build heat map', errors: [] });
    }
  }
  async effectivenessByService(req: Request, res: Response) {
    try {
      const data = await directorInsightsService.effectivenessByService(req.user!.company_id!);
      return res.json({ success: true, data, meta: {} });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to build effectiveness summary', errors: [] });
    }
  }
  async riAssuranceSummary(req: Request, res: Response) {
    try {
      const data = await directorInsightsService.riAssuranceSummary(req.user!.company_id!);
      return res.json({ success: true, data, meta: {} });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to build assurance summary', errors: [] });
    }
  }
}

export const directorInsightsController = new DirectorInsightsController();
