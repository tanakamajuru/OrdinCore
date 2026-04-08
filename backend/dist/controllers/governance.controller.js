"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.governanceController = exports.GovernanceController = void 0;
const governance_service_1 = require("../services/governance.service");
class GovernanceController {
    async createTemplate(req, res) {
        try {
            const company_id = req.user.company_id;
            const template = await governance_service_1.governanceService.createTemplate(company_id, req.user.user_id, req.body);
            return res.status(201).json({ success: true, data: template, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create template';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async getTemplates(req, res) {
        try {
            const company_id = req.user.company_id;
            const templates = await governance_service_1.governanceService.getTemplates(company_id);
            return res.json({ success: true, data: templates, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch templates';
            return res.status(500).json({ success: false, message, errors: [] });
        }
    }
    async createPulse(req, res) {
        try {
            const company_id = req.user.company_id;
            const pulse = await governance_service_1.governanceService.createPulse(company_id, req.body);
            return res.status(201).json({ success: true, data: pulse, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create pulse';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async getPulses(req, res) {
        try {
            const company_id = req.user.company_id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const filters = {
                status: req.query.status,
                house_id: req.query.house_id,
                assigned_user_id: req.query.assigned_user_id
            };
            const result = await governance_service_1.governanceService.findAllPulses(company_id, filters, page, limit);
            return res.json({ success: true, data: result.pulses, meta: { total: result.total, page, limit, pages: result.pages } });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch pulses';
            return res.status(500).json({ success: false, message, errors: [] });
        }
    }
    async getPulseById(req, res) {
        try {
            const company_id = req.user.company_id;
            const pulse = await governance_service_1.governanceService.findPulseById(req.params.id, company_id);
            return res.json({ success: true, data: pulse, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Pulse not found';
            return res.status(404).json({ success: false, message, errors: [] });
        }
    }
    async submitAnswers(req, res) {
        try {
            const company_id = req.user.company_id;
            const result = await governance_service_1.governanceService.submitAnswers(req.params.id, company_id, req.user.user_id, req.body.answers);
            return res.json({ success: true, data: result, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to submit answers';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async getTemplateQuestions(req, res) {
        try {
            const company_id = req.user.company_id;
            const questions = await governance_service_1.governanceService.getTemplateQuestions(req.params.id, company_id);
            return res.json({ success: true, data: questions, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get template questions';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async addTemplateQuestion(req, res) {
        try {
            const company_id = req.user.company_id;
            const question = await governance_service_1.governanceService.addTemplateQuestion(req.params.id, company_id, req.body);
            return res.status(201).json({ success: true, data: question, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to add template question';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async updateTemplateQuestion(req, res) {
        try {
            const company_id = req.user.company_id;
            const question = await governance_service_1.governanceService.updateTemplateQuestion(req.params.questionId, req.params.id, company_id, req.body);
            return res.json({ success: true, data: question, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update template question';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async removeTemplateQuestion(req, res) {
        try {
            const company_id = req.user.company_id;
            await governance_service_1.governanceService.removeTemplateQuestion(req.params.questionId, req.params.id, company_id);
            return res.json({ success: true, data: { message: 'Question removed' }, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to remove template question';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async getPulseAnswers(req, res) {
        try {
            const company_id = req.user.company_id;
            const answers = await governance_service_1.governanceService.getPulseAnswers(req.params.id, company_id);
            return res.json({ success: true, data: answers, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get pulse answers';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async updatePulseStatus(req, res) {
        try {
            const company_id = req.user.company_id;
            const result = await governance_service_1.governanceService.updatePulseStatus(req.params.id, company_id, req.body.status);
            return res.json({ success: true, data: result, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update pulse status';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
}
exports.GovernanceController = GovernanceController;
exports.governanceController = new GovernanceController();
//# sourceMappingURL=governance.controller.js.map