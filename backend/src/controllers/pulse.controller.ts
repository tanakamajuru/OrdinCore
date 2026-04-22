import { Request, Response } from 'express';
import { pulseService } from '../services/pulse.service';
import logger from '../utils/logger';

/** Narrows company_id from string|null → string, throwing a 403-tagged error if absent. */
function requireCompany(req: Request): string {
    const company_id = req.user!.company_id;
    if (!company_id) {
        const err = new Error('Access denied: no company associated with this account') as any;
        err.statusCode = 403;
        throw err;
    }
    return company_id;
}

export class PulseController {
    async createPulse(req: Request, res: Response) {
        try {
            const company_id = requireCompany(req);
            const user_id = req.user!.user_id;
            const pulse = await pulseService.createPulse(company_id, user_id, req.body);
            res.status(201).json({ success: true, data: pulse });
        } catch (err: any) {
            logger.error('Error creating pulse', err);
            res.status(err.statusCode ?? 400).json({ success: false, message: err.message });
        }
    }

    async getPulses(req: Request, res: Response) {
        try {
            const company_id = requireCompany(req);
            const filters: any = { ...req.query };
            if (typeof filters.review_status === 'string' && filters.review_status.includes(',')) {
                filters.review_status = filters.review_status.split(',');
            }
            const pulses = await pulseService.getPulses(company_id, filters);
            res.json({ success: true, data: pulses });
        } catch (err: any) {
            res.status(err.statusCode ?? 500).json({ success: false, message: err.message });
        }
    }

    async getPulseById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const company_id = requireCompany(req);
            const pulse = await pulseService.getPulseById(id, company_id);
            res.json({ success: true, data: pulse });
        } catch (err: any) {
            res.status(err.statusCode ?? 404).json({ success: false, message: err.message });
        }
    }

    async reviewPulse(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const company_id = requireCompany(req);
            const user_id = req.user!.user_id;
            const updated = await pulseService.reviewPulse(id, company_id, user_id, req.body);
            res.json({ success: true, data: updated });
        } catch (err: any) {
            res.status(err.statusCode ?? 400).json({ success: false, message: err.message });
        }
    }

    async linkToRisk(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { risk_id, link_note } = req.body;
            const company_id = requireCompany(req);
            const user_id = req.user!.user_id;
            const result = await pulseService.linkToRisk(id, company_id, user_id, risk_id, link_note);
            res.json({ success: true, data: result });
        } catch (err: any) {
            res.status(err.statusCode ?? 400).json({ success: false, message: err.message });
        }
    }

    async getDashboardFeed(req: Request, res: Response) {
        try {
            const company_id = requireCompany(req);
            const houseIds = req.user!.house_ids ?? [];
            if (req.query.house_id) {
                houseIds.push(req.query.house_id as string);
            }

            const feed = await pulseService.getDashboardFeed(company_id, houseIds);
            res.json({ success: true, data: feed });
        } catch (err: any) {
            res.status(err.statusCode ?? 500).json({ success: false, message: err.message });
        }
    }
}

export const pulseController = new PulseController();

