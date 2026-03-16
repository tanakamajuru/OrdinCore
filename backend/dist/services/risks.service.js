"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.risksService = exports.RisksService = void 0;
const risks_repo_1 = require("../repositories/risks.repo");
const eventBus_1 = require("../events/eventBus");
const database_1 = require("../config/database");
const uuid_1 = require("uuid");
class RisksService {
    async create(company_id, created_by, data) {
        const risk = await risks_repo_1.risksRepo.create({ company_id, created_by, ...data });
        await risks_repo_1.risksRepo.addEvent(risk.id, company_id, 'created', 'Risk created', created_by);
        await eventBus_1.eventBus.emitEvent(eventBus_1.EVENTS.RISK_CREATED, { risk_id: risk.id, company_id, created_by, severity: risk.severity });
        return risk;
    }
    async findAll(company_id, filters = {}, page = 1, limit = 50) {
        const offset = (page - 1) * limit;
        const [risks, total] = await Promise.all([
            risks_repo_1.risksRepo.findByCompany(company_id, filters, limit, offset),
            risks_repo_1.risksRepo.countByCompany(company_id, filters),
        ]);
        return { risks, total, page, limit, pages: Math.ceil(total / limit) };
    }
    async findById(id, company_id) {
        const risk = await risks_repo_1.risksRepo.findById(id, company_id);
        if (!risk)
            throw new Error('Risk not found');
        return risk;
    }
    async update(id, company_id, user_id, data) {
        const risk = await risks_repo_1.risksRepo.findById(id, company_id);
        if (!risk)
            throw new Error('Risk not found');
        const updated = await risks_repo_1.risksRepo.update(id, company_id, data);
        await risks_repo_1.risksRepo.addEvent(id, company_id, 'updated', `Risk updated`, user_id);
        return updated;
    }
    async delete(id, company_id, user_id) {
        const risk = await risks_repo_1.risksRepo.findById(id, company_id);
        if (!risk)
            throw new Error('Risk not found');
        await risks_repo_1.risksRepo.delete(id, company_id);
        await risks_repo_1.risksRepo.addEvent(id, company_id, 'closed', 'Risk closed', user_id);
    }
    async addEvent(risk_id, company_id, user_id, data) {
        const risk = await risks_repo_1.risksRepo.findById(risk_id, company_id);
        if (!risk)
            throw new Error('Risk not found');
        return risks_repo_1.risksRepo.addEvent(risk_id, company_id, data.event_type, data.description, user_id);
    }
    async addAction(risk_id, company_id, user_id, data) {
        const risk = await risks_repo_1.risksRepo.findById(risk_id, company_id);
        if (!risk)
            throw new Error('Risk not found');
        return risks_repo_1.risksRepo.addAction(risk_id, company_id, { ...data, created_by: user_id });
    }
    async getActions(risk_id, company_id) {
        const risk = await risks_repo_1.risksRepo.findById(risk_id, company_id);
        if (!risk)
            throw new Error('Risk not found');
        return risks_repo_1.risksRepo.getActions(risk_id, company_id);
    }
    async escalate(risk_id, company_id, escalated_by, data) {
        const risk = await risks_repo_1.risksRepo.findById(risk_id, company_id);
        if (!risk)
            throw new Error('Risk not found');
        // Create escalation record
        const id = (0, uuid_1.v4)();
        await (0, database_1.query)(`INSERT INTO escalations (id, company_id, risk_id, escalated_by, escalated_to, reason, status)
       VALUES ($1,$2,$3,$4,$5,$6,'pending')`, [id, company_id, risk_id, escalated_by, data.escalated_to, data.reason]);
        await risks_repo_1.risksRepo.update(risk_id, company_id, { status: 'escalated' });
        await risks_repo_1.risksRepo.addEvent(risk_id, company_id, 'escalated', `Risk escalated: ${data.reason}`, escalated_by);
        await eventBus_1.eventBus.emitEvent(eventBus_1.EVENTS.RISK_ESCALATED, { risk_id, company_id, escalated_by, escalated_to: data.escalated_to });
        return { escalation_id: id, message: 'Risk escalated successfully' };
    }
    async getTimeline(risk_id, company_id) {
        const risk = await risks_repo_1.risksRepo.findById(risk_id, company_id);
        if (!risk)
            throw new Error('Risk not found');
        return risks_repo_1.risksRepo.getTimeline(risk_id, company_id);
    }
    async getCategories(company_id) {
        return risks_repo_1.risksRepo.getCategories(company_id);
    }
    async createCategory(company_id, user_id, data) {
        return risks_repo_1.risksRepo.createCategory(company_id, { ...data, created_by: user_id });
    }
    async getAttachments(risk_id, company_id) {
        const risk = await risks_repo_1.risksRepo.findById(risk_id, company_id);
        if (!risk)
            throw new Error('Risk not found');
        return risks_repo_1.risksRepo.getAttachments(risk_id, company_id);
    }
    async addAttachment(risk_id, company_id, user_id, data) {
        const risk = await risks_repo_1.risksRepo.findById(risk_id, company_id);
        if (!risk)
            throw new Error('Risk not found');
        const attachment = await risks_repo_1.risksRepo.addAttachment(risk_id, company_id, { ...data, uploaded_by: user_id });
        await risks_repo_1.risksRepo.addEvent(risk_id, company_id, 'attachment_added', `Attachment added: ${data.file_name}`, user_id);
        return attachment;
    }
    async removeAttachment(risk_id, company_id, user_id, attachment_id) {
        const risk = await risks_repo_1.risksRepo.findById(risk_id, company_id);
        if (!risk)
            throw new Error('Risk not found');
        await risks_repo_1.risksRepo.removeAttachment(attachment_id, risk_id, company_id);
        await risks_repo_1.risksRepo.addEvent(risk_id, company_id, 'attachment_removed', `Attachment removed`, user_id);
    }
    async assignRisk(risk_id, company_id, user_id, assigned_to) {
        const risk = await risks_repo_1.risksRepo.findById(risk_id, company_id);
        if (!risk)
            throw new Error('Risk not found');
        const updated = await risks_repo_1.risksRepo.assignRisk(risk_id, company_id, assigned_to);
        await risks_repo_1.risksRepo.addEvent(risk_id, company_id, 'assigned', `Risk assigned`, user_id);
        return updated;
    }
    async getAssignedToMe(company_id, user_id, page = 1, limit = 50) {
        const offset = (page - 1) * limit;
        const filters = { assigned_to: user_id, status: 'open' };
        const [risks, total] = await Promise.all([
            risks_repo_1.risksRepo.findByCompany(company_id, filters, limit, offset),
            risks_repo_1.risksRepo.countByCompany(company_id, filters),
        ]);
        return { risks, total, page, limit, pages: Math.ceil(total / limit) };
    }
    async updateStatus(risk_id, company_id, user_id, status) {
        const risk = await risks_repo_1.risksRepo.findById(risk_id, company_id);
        if (!risk)
            throw new Error('Risk not found');
        const updated = await risks_repo_1.risksRepo.updateStatus(risk_id, company_id, status);
        await risks_repo_1.risksRepo.addEvent(risk_id, company_id, 'status_updated', `Status changed to ${status}`, user_id);
        if (status === 'closed' || status === 'resolved') {
            await risks_repo_1.risksRepo.update(risk_id, company_id, { resolved_at: new Date() });
        }
        return updated;
    }
}
exports.RisksService = RisksService;
exports.risksService = new RisksService();
//# sourceMappingURL=risks.service.js.map