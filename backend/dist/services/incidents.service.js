"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incidentsService = exports.IncidentsService = void 0;
const incidents_repo_1 = require("../repositories/incidents.repo");
const eventBus_1 = require("../events/eventBus");
class IncidentsService {
    async create(company_id, created_by, data) {
        const incident = await incidents_repo_1.incidentsRepo.create({ company_id, created_by, ...data });
        // Add creation event to timeline
        await incidents_repo_1.incidentsRepo.addEvent(incident.id, company_id, {
            event_type: 'created',
            title: 'Incident Reported',
            description: `Incident "${incident.title}" was reported and logged`,
            metadata: { severity: incident.severity, category: incident.category_id },
            created_by
        });
        await eventBus_1.eventBus.emitEvent(eventBus_1.EVENTS.INCIDENT_CREATED, { incident_id: incident.id, company_id, created_by, severity: incident.severity });
        return incident;
    }
    async findAll(company_id, filters = {}, page = 1, limit = 50) {
        const offset = (page - 1) * limit;
        const [incidents, total] = await Promise.all([
            incidents_repo_1.incidentsRepo.findByCompany(company_id, filters, limit, offset),
            incidents_repo_1.incidentsRepo.countByCompany(company_id, filters),
        ]);
        return { incidents, total, page, limit, pages: Math.ceil(total / limit) };
    }
    async findById(id, company_id) {
        const incident = await incidents_repo_1.incidentsRepo.findById(id, company_id);
        if (!incident)
            throw new Error('Incident not found');
        return incident;
    }
    async update(id, company_id, data) {
        const incident = await incidents_repo_1.incidentsRepo.findById(id, company_id);
        if (!incident)
            throw new Error('Incident not found');
        const updated = await incidents_repo_1.incidentsRepo.update(id, company_id, data);
        // Add update event to timeline
        await incidents_repo_1.incidentsRepo.addEvent(id, company_id, {
            event_type: 'updated',
            title: 'Incident Updated',
            description: 'Incident details were updated',
            metadata: { updated_fields: Object.keys(data) },
            created_by: data.updated_by || incident.created_by
        });
        return updated;
    }
    async delete(id, company_id) {
        const incident = await incidents_repo_1.incidentsRepo.findById(id, company_id);
        if (!incident)
            throw new Error('Incident not found');
        await incidents_repo_1.incidentsRepo.delete(id, company_id);
    }
    async getTimeline(incident_id, company_id) {
        const incident = await incidents_repo_1.incidentsRepo.findById(incident_id, company_id);
        if (!incident)
            throw new Error('Incident not found');
        return incidents_repo_1.incidentsRepo.getTimeline(incident_id, company_id);
    }
    async getGovernanceTimeline(incident_id, company_id) {
        const incident = await incidents_repo_1.incidentsRepo.findById(incident_id, company_id);
        if (!incident)
            throw new Error('Incident not found');
        return incidents_repo_1.incidentsRepo.getGovernanceTimeline(incident_id, company_id);
    }
    async getCategories(company_id) {
        return incidents_repo_1.incidentsRepo.getCategories(company_id);
    }
    async createCategory(company_id, user_id, data) {
        return incidents_repo_1.incidentsRepo.createCategory(company_id, { ...data, created_by: user_id });
    }
    async getAttachments(incident_id, company_id) {
        const incident = await incidents_repo_1.incidentsRepo.findById(incident_id, company_id);
        if (!incident)
            throw new Error('Incident not found');
        return incidents_repo_1.incidentsRepo.getAttachments(incident_id, company_id);
    }
    async addAttachment(incident_id, company_id, user_id, data) {
        const incident = await incidents_repo_1.incidentsRepo.findById(incident_id, company_id);
        if (!incident)
            throw new Error('Incident not found');
        const attachment = await incidents_repo_1.incidentsRepo.addAttachment(incident_id, company_id, { ...data, uploaded_by: user_id });
        return attachment;
    }
    async removeAttachment(incident_id, company_id, user_id, attachment_id) {
        const incident = await incidents_repo_1.incidentsRepo.findById(incident_id, company_id);
        if (!incident)
            throw new Error('Incident not found');
        await incidents_repo_1.incidentsRepo.removeAttachment(attachment_id, incident_id, company_id);
    }
    async assignIncident(incident_id, company_id, user_id, assigned_to) {
        const incident = await incidents_repo_1.incidentsRepo.findById(incident_id, company_id);
        if (!incident)
            throw new Error('Incident not found');
        const updated = await incidents_repo_1.incidentsRepo.assignIncident(incident_id, company_id, assigned_to);
        return updated;
    }
    async resolveIncident(incident_id, company_id, user_id, resolution_notes) {
        const incident = await incidents_repo_1.incidentsRepo.findById(incident_id, company_id);
        if (!incident)
            throw new Error('Incident not found');
        const updated = await incidents_repo_1.incidentsRepo.resolveIncident(incident_id, company_id, resolution_notes);
        // Add resolution event to timeline
        await incidents_repo_1.incidentsRepo.addEvent(incident_id, company_id, {
            event_type: 'resolved',
            title: 'Incident Resolved',
            description: resolution_notes || 'Incident was resolved',
            metadata: { resolved_by: user_id, resolved_at: new Date() },
            created_by: user_id
        });
        await eventBus_1.eventBus.emitEvent(eventBus_1.EVENTS.INCIDENT_RESOLVED, { incident_id, company_id, resolved_by: user_id });
        return updated;
    }
}
exports.IncidentsService = IncidentsService;
exports.incidentsService = new IncidentsService();
//# sourceMappingURL=incidents.service.js.map