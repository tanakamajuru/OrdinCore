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

            // Fallback: if the form omitted the house/service, resolve it from the
            // recorder's own assignment. This prevents the "some TLs can't record"
            // failure where a Team Leader with a single assigned house submits without
            // an explicit service_id. house_id is NOT NULL on governance_pulses, so a
            // missing value must be resolved or rejected with a clear message — never a
            // raw database constraint error.
            const body = { ...req.body };
            if (!body.house_id && !body.service_id) {
                const assigned = (req.user!.assigned_house_ids || []).filter(
                    (h: string) => h && h !== '00000000-0000-0000-0000-000000000000'
                );
                if (assigned.length === 1) {
                    body.house_id = assigned[0];
                } else if (assigned.length === 0) {
                    return res.status(422).json({
                        success: false,
                        message: 'You are not assigned to a service, so this signal cannot be recorded against a house. Ask an administrator to assign you to a service before recording signals.'
                    });
                } else {
                    return res.status(422).json({
                        success: false,
                        message: 'Please choose which service this signal relates to before recording it.'
                    });
                }
            }

            const pulse = await pulseService.createPulse(company_id, user_id, body);
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
            if (typeof filters.severity === 'string' && filters.severity.includes(',')) {
                filters.severity = filters.severity.split(',');
            }
            // A Team Leader's signal list is always scoped to the house(s) they can see
            // (assigned_house_ids — already widened if granted all-site visibility), so
            // the "All site signals" view never leaks cross-site signals.
            if ((req.user!.role || '').toUpperCase() === 'TEAM_LEADER' && !filters.house_id) {
                const houseIds = req.user!.assigned_house_ids || [];
                filters.house_id = houseIds.length > 0 ? houseIds : ['00000000-0000-0000-0000-000000000000'];
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

    async reassignSignal(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const company_id = requireCompany(req);
            const { assigned_to } = req.body || {};
            const updated = await pulseService.reassignSignal(id, company_id, assigned_to, req.user!.user_id);
            res.json({ success: true, data: updated });
        } catch (err: any) {
            res.status(err.statusCode ?? 400).json({ success: false, message: err.message });
        }
    }

    async getDashboardFeed(req: Request, res: Response) {
        try {
            const company_id = requireCompany(req);
            const houseIds = req.user!.assigned_house_ids || [];
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

