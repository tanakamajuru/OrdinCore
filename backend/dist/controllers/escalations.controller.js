"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escalationsController = exports.EscalationsController = void 0;
const escalations_service_1 = require("../services/escalations.service");
class EscalationsController {
    async findAll(req, res) {
        try {
            const company_id = req.user.company_id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const filters = { status: req.query.status };
            const result = await escalations_service_1.escalationsService.findAll(company_id, filters, page, limit);
            return res.json({ success: true, data: result.escalations, meta: { total: result.total, page, limit, pages: result.pages } });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to fetch escalations', errors: [] });
        }
    }
    async findById(req, res) {
        try {
            const company_id = req.user.company_id;
            const escalation = await escalations_service_1.escalationsService.findById(req.params.id, company_id);
            return res.json({ success: true, data: escalation, meta: {} });
        }
        catch (err) {
            return res.status(404).json({ success: false, message: err instanceof Error ? err.message : 'Escalation not found', errors: [] });
        }
    }
    async resolve(req, res) {
        try {
            const company_id = req.user.company_id;
            const result = await escalations_service_1.escalationsService.resolve(req.params.id, company_id, req.user.user_id, req.body.resolution_notes || '');
            return res.json({ success: true, data: result, meta: {} });
        }
        catch (err) {
            return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to resolve escalation', errors: [] });
        }
    }
    async acknowledge(req, res) {
        try {
            const company_id = req.user.company_id;
            const result = await escalations_service_1.escalationsService.acknowledge(req.params.id, company_id, req.user.user_id);
            return res.json({ success: true, data: result, meta: {} });
        }
        catch (err) {
            return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to acknowledge escalation', errors: [] });
        }
    }
    async addAction(req, res) {
        try {
            const company_id = req.user.company_id;
            const action = await escalations_service_1.escalationsService.addAction(req.params.id, company_id, req.user.user_id, req.body);
            return res.status(201).json({ success: true, data: action, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to add escalation action';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async getActions(req, res) {
        try {
            const company_id = req.user.company_id;
            const actions = await escalations_service_1.escalationsService.getActions(req.params.id, company_id);
            return res.json({ success: true, data: actions, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get escalation actions';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async assignEscalation(req, res) {
        try {
            const company_id = req.user.company_id;
            const result = await escalations_service_1.escalationsService.assignEscalation(req.params.id, company_id, req.user.user_id, req.body.assigned_to);
            return res.json({ success: true, data: result, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to assign escalation';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async updatePriority(req, res) {
        try {
            const company_id = req.user.company_id;
            const result = await escalations_service_1.escalationsService.updatePriority(req.params.id, company_id, req.user.user_id, req.body.priority);
            return res.json({ success: true, data: result, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update escalation priority';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
}
exports.EscalationsController = EscalationsController;
exports.escalationsController = new EscalationsController();
//# sourceMappingURL=escalations.controller.js.map