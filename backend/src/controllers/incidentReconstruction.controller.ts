import { Request, Response } from 'express';
import { incidentReconstructionService } from '../services/incidentReconstruction.service';

export class IncidentReconstructionController {
  async create(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const result = await incidentReconstructionService.create(company_id, req.user!.user_id, req.body);
      return res.status(201).json({ success: true, data: result });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to create reconstruction' });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const result = await incidentReconstructionService.findById(req.params.id, company_id);
      if (!result) return res.status(404).json({ success: false, message: 'Not found' });
      return res.json({ success: true, data: result });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: 'Error fetching reconstruction' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const result = await incidentReconstructionService.updateSection(req.params.id, company_id, req.body);
      return res.json({ success: true, data: result });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to update reconstruction' });
    }
  }

  async linkPulses(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const { pulseIds } = req.body;
      const result = await incidentReconstructionService.linkPulses(req.params.id, company_id, pulseIds);
      return res.json({ success: true, data: result });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: 'Failed to link pulses' });
    }
  }

  async getTimeline(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const result = await incidentReconstructionService.getTimeline(req.params.id, company_id);
      return res.json({ success: true, data: result });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: 'Error fetching timeline' });
    }
  }

  async complete(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const result = await incidentReconstructionService.complete(req.params.id, company_id, req.user!.user_id);
      return res.json({ success: true, data: result });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to complete reconstruction' });
    }
  }
}

export const incidentReconstructionController = new IncidentReconstructionController();
