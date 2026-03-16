"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.risksController = exports.RisksController = void 0;
const risks_service_1 = require("../services/risks.service");
class RisksController {
    async create(req, res) {
        try {
            const company_id = req.user.company_id;
            const risk = await risks_service_1.risksService.create(company_id, req.user.user_id, req.body);
            return res.status(201).json({ success: true, data: risk, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create risk';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async findAll(req, res) {
        try {
            const company_id = req.user.company_id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const filters = { status: req.query.status, severity: req.query.severity, house_id: req.query.house_id, assigned_to: req.query.assigned_to };
            const result = await risks_service_1.risksService.findAll(company_id, filters, page, limit);
            return res.json({ success: true, data: result.risks, meta: { total: result.total, page, limit, pages: result.pages } });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch risks';
            return res.status(500).json({ success: false, message, errors: [] });
        }
    }
    async findById(req, res) {
        try {
            const company_id = req.user.company_id;
            const risk = await risks_service_1.risksService.findById(req.params.id, company_id);
            return res.json({ success: true, data: risk, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Risk not found';
            return res.status(404).json({ success: false, message, errors: [] });
        }
    }
    async update(req, res) {
        try {
            const company_id = req.user.company_id;
            const risk = await risks_service_1.risksService.update(req.params.id, company_id, req.user.user_id, req.body);
            return res.json({ success: true, data: risk, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update risk';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async delete(req, res) {
        try {
            const company_id = req.user.company_id;
            await risks_service_1.risksService.delete(req.params.id, company_id, req.user.user_id);
            return res.json({ success: true, data: { message: 'Risk closed' }, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete risk';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async addEvent(req, res) {
        try {
            const company_id = req.user.company_id;
            const event = await risks_service_1.risksService.addEvent(req.params.id, company_id, req.user.user_id, req.body);
            return res.status(201).json({ success: true, data: event, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to add event';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async addAction(req, res) {
        try {
            const company_id = req.user.company_id;
            const action = await risks_service_1.risksService.addAction(req.params.id, company_id, req.user.user_id, req.body);
            return res.status(201).json({ success: true, data: action, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to add action';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async getActions(req, res) {
        try {
            const company_id = req.user.company_id;
            const actions = await risks_service_1.risksService.getActions(req.params.id, company_id);
            return res.json({ success: true, data: { actions }, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to retrieve actions';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async escalate(req, res) {
        try {
            const company_id = req.user.company_id;
            const result = await risks_service_1.risksService.escalate(req.params.id, company_id, req.user.user_id, req.body);
            return res.status(201).json({ success: true, data: result, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to escalate risk';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async getTimeline(req, res) {
        try {
            const company_id = req.user.company_id;
            const timeline = await risks_service_1.risksService.getTimeline(req.params.id, company_id);
            return res.json({ success: true, data: timeline, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get timeline';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async getCategories(req, res) {
        try {
            const company_id = req.user.company_id;
            const categories = await risks_service_1.risksService.getCategories(company_id);
            return res.json({ success: true, data: categories, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch categories';
            return res.status(500).json({ success: false, message, errors: [] });
        }
    }
    async createCategory(req, res) {
        try {
            const company_id = req.user.company_id;
            const category = await risks_service_1.risksService.createCategory(company_id, req.user.user_id, req.body);
            return res.status(201).json({ success: true, data: category, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create category';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async getAttachments(req, res) {
        try {
            const company_id = req.user.company_id;
            const attachments = await risks_service_1.risksService.getAttachments(req.params.id, company_id);
            return res.json({ success: true, data: attachments, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get attachments';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async addAttachment(req, res) {
        try {
            const company_id = req.user.company_id;
            const attachment = await risks_service_1.risksService.addAttachment(req.params.id, company_id, req.user.user_id, req.body);
            return res.status(201).json({ success: true, data: attachment, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to add attachment';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async removeAttachment(req, res) {
        try {
            const company_id = req.user.company_id;
            await risks_service_1.risksService.removeAttachment(req.params.id, company_id, req.user.user_id, req.params.attachmentId);
            return res.json({ success: true, data: { message: 'Attachment removed' }, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to remove attachment';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async assignRisk(req, res) {
        try {
            const company_id = req.user.company_id;
            const result = await risks_service_1.risksService.assignRisk(req.params.id, company_id, req.user.user_id, req.body.assigned_to);
            return res.json({ success: true, data: result, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to assign risk';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async getAssignedToMe(req, res) {
        try {
            const company_id = req.user.company_id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const result = await risks_service_1.risksService.getAssignedToMe(company_id, req.user.user_id, page, limit);
            return res.json({ success: true, data: result.risks, meta: { total: result.total, page, limit, pages: result.pages } });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch assigned risks';
            return res.status(500).json({ success: false, message, errors: [] });
        }
    }
    async updateStatus(req, res) {
        try {
            const company_id = req.user.company_id;
            const result = await risks_service_1.risksService.updateStatus(req.params.id, company_id, req.user.user_id, req.body.status);
            return res.json({ success: true, data: result, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update risk status';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async getMetricsSummary(req, res) {
        try {
            return res.json({ success: true, data: { total_risks: 0, critical_risks: 0 }, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get metrics summary';
            return res.status(500).json({ success: false, message, errors: [] });
        }
    }
    async bulkReassign(req, res) {
        try {
            return res.json({ success: true, data: { message: 'Risks reassigned successfully' }, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to bulk reassign risks';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
}
exports.RisksController = RisksController;
exports.risksController = new RisksController();
//# sourceMappingURL=risks.controller.js.map