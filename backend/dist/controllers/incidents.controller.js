"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incidentsController = exports.IncidentsController = void 0;
const incidents_service_1 = require("../services/incidents.service");
class IncidentsController {
    async create(req, res) {
        try {
            const company_id = req.user.company_id;
            const incident = await incidents_service_1.incidentsService.create(company_id, req.user.user_id, req.body);
            return res.status(201).json({ success: true, data: incident, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create incident';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async findAll(req, res) {
        try {
            const company_id = req.user.company_id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const filters = { status: req.query.status, severity: req.query.severity, house_id: req.query.house_id };
            const result = await incidents_service_1.incidentsService.findAll(company_id, filters, page, limit);
            return res.json({ success: true, data: result.incidents, meta: { total: result.total, page, limit, pages: result.pages } });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch incidents';
            return res.status(500).json({ success: false, message, errors: [] });
        }
    }
    async findById(req, res) {
        try {
            const company_id = req.user.company_id;
            const incident = await incidents_service_1.incidentsService.findById(req.params.id, company_id);
            return res.json({ success: true, data: incident, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Incident not found';
            return res.status(404).json({ success: false, message, errors: [] });
        }
    }
    async update(req, res) {
        try {
            const company_id = req.user.company_id;
            const incident = await incidents_service_1.incidentsService.update(req.params.id, company_id, req.body);
            return res.json({ success: true, data: incident, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update incident';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async delete(req, res) {
        try {
            const company_id = req.user.company_id;
            await incidents_service_1.incidentsService.delete(req.params.id, company_id);
            return res.json({ success: true, data: { message: 'Incident closed' }, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete incident';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async getTimeline(req, res) {
        try {
            const company_id = req.user.company_id;
            const timeline = await incidents_service_1.incidentsService.getTimeline(req.params.id, company_id);
            return res.json({ success: true, data: { timeline }, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get timeline';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async getGovernanceTimeline(req, res) {
        try {
            const company_id = req.user.company_id;
            const timeline = await incidents_service_1.incidentsService.getGovernanceTimeline(req.params.id, company_id);
            return res.json({ success: true, data: { timeline }, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get governance timeline';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async getCategories(req, res) {
        try {
            const company_id = req.user.company_id;
            const categories = await incidents_service_1.incidentsService.getCategories(company_id);
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
            const category = await incidents_service_1.incidentsService.createCategory(company_id, req.user.user_id, req.body);
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
            const attachments = await incidents_service_1.incidentsService.getAttachments(req.params.id, company_id);
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
            const attachment = await incidents_service_1.incidentsService.addAttachment(req.params.id, company_id, req.user.user_id, req.body);
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
            await incidents_service_1.incidentsService.removeAttachment(req.params.id, company_id, req.user.user_id, req.params.attachmentId);
            return res.json({ success: true, data: { message: 'Attachment removed' }, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to remove attachment';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async assignIncident(req, res) {
        try {
            const company_id = req.user.company_id;
            const result = await incidents_service_1.incidentsService.assignIncident(req.params.id, company_id, req.user.user_id, req.body.assigned_to);
            return res.json({ success: true, data: result, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to assign incident';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async resolveIncident(req, res) {
        try {
            const company_id = req.user.company_id;
            const result = await incidents_service_1.incidentsService.resolveIncident(req.params.id, company_id, req.user.user_id, req.body.resolution_notes);
            return res.json({ success: true, data: result, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to resolve incident';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async bulkResolve(req, res) {
        try {
            return res.json({ success: true, data: { message: 'Incidents resolved successfully' }, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to bulk resolve incidents';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
}
exports.IncidentsController = IncidentsController;
exports.incidentsController = new IncidentsController();
//# sourceMappingURL=incidents.controller.js.map