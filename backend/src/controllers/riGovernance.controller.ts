import { Request, Response } from 'express';
import { riGovernanceService } from '../services/riGovernance.service';

export class RiGovernanceController {
  async getDashboardOverview(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const data = await riGovernanceService.getDashboardOverview(company_id);
      return res.json({ success: true, data });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to fetch RI dashboard' });
    }
  }

  async acknowledgeIncident(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const user_id = req.user!.user_id;
      const { incident_id } = req.params;
      const result = await riGovernanceService.acknowledgeIncident(company_id, user_id, incident_id, req.body);
      return res.status(201).json({ success: true, data: result });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to acknowledge incident' });
    }
  }

  async createQuery(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const user_id = req.user!.user_id;
      const { review_id } = req.params;
      const { query_text } = req.body;
      const result = await riGovernanceService.createQuery(company_id, user_id, review_id, query_text);
      return res.status(201).json({ success: true, data: result });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to create governance query' });
    }
  }

  async getEvidencePack(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const { house_id } = req.params;
      const data = await riGovernanceService.getEvidencePack(company_id, house_id);
      return res.json({ success: true, data });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to fetch evidence pack' });
    }
  }

  async getRmQueries(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const { house_id } = req.query;
      const data = await riGovernanceService.getRmQueries(company_id, house_id as string);
      return res.json({ success: true, data });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to fetch RM queries' });
    }
  }

  async respondToQuery(req: Request, res: Response) {
    try {
      const user_id = req.user!.user_id;
      const { query_id } = req.params;
      const { response_text } = req.body;
      const data = await riGovernanceService.respondToQuery(query_id, response_text, user_id);
      return res.json({ success: true, data });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to respond to query' });
    }
  }
}

export const riGovernanceController = new RiGovernanceController();
