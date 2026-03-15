import { incidentsRepo } from '../repositories/incidents.repo';
import { eventBus, EVENTS } from '../events/eventBus';

export class IncidentsService {
  async create(company_id: string, created_by: string, data: {
    house_id: string; title: string; description: string; severity?: string; occurred_at: Date;
    location?: string; immediate_action?: string; category_id?: string; assigned_to?: string;
  }) {
    const incident = await incidentsRepo.create({ company_id, created_by, ...data });
    await eventBus.emitEvent(EVENTS.INCIDENT_CREATED, { incident_id: incident.id, company_id, created_by, severity: incident.severity });
    return incident;
  }

  async findAll(company_id: string, filters: Record<string, unknown> = {}, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const [incidents, total] = await Promise.all([
      incidentsRepo.findByCompany(company_id, filters, limit, offset),
      incidentsRepo.countByCompany(company_id, filters),
    ]);
    return { incidents, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findById(id: string, company_id: string) {
    const incident = await incidentsRepo.findById(id, company_id);
    if (!incident) throw new Error('Incident not found');
    return incident;
  }

  async update(id: string, company_id: string, data: Record<string, unknown>) {
    const incident = await incidentsRepo.findById(id, company_id);
    if (!incident) throw new Error('Incident not found');
    return incidentsRepo.update(id, company_id, data);
  }

  async delete(id: string, company_id: string) {
    const incident = await incidentsRepo.findById(id, company_id);
    if (!incident) throw new Error('Incident not found');
    await incidentsRepo.delete(id, company_id);
    await incidentsRepo.addEvent(id, company_id, 'closed', 'Incident closed', 'system');
  }

  async getTimeline(incident_id: string, company_id: string) {
    const incident = await incidentsRepo.findById(incident_id, company_id);
    if (!incident) throw new Error('Incident not found');
    return incidentsRepo.getTimeline(incident_id, company_id);
  }

  async getCategories(company_id: string) {
    return incidentsRepo.getCategories(company_id);
  }

  async createCategory(company_id: string, user_id: string, data: { name: string; description?: string; severity_level?: string }) {
    return incidentsRepo.createCategory(company_id, { ...data, created_by: user_id });
  }

  async getAttachments(incident_id: string, company_id: string) {
    const incident = await incidentsRepo.findById(incident_id, company_id);
    if (!incident) throw new Error('Incident not found');
    return incidentsRepo.getAttachments(incident_id, company_id);
  }

  async addAttachment(incident_id: string, company_id: string, user_id: string, data: { file_name: string; file_url: string; file_type?: string; file_size?: number }) {
    const incident = await incidentsRepo.findById(incident_id, company_id);
    if (!incident) throw new Error('Incident not found');
    const attachment = await incidentsRepo.addAttachment(incident_id, company_id, { ...data, uploaded_by: user_id });
    await incidentsRepo.addEvent(incident_id, company_id, 'attachment_added', `Attachment added: ${data.file_name}`, user_id);
    return attachment;
  }

  async removeAttachment(incident_id: string, company_id: string, user_id: string, attachment_id: string) {
    const incident = await incidentsRepo.findById(incident_id, company_id);
    if (!incident) throw new Error('Incident not found');
    await incidentsRepo.removeAttachment(attachment_id, incident_id, company_id);
    await incidentsRepo.addEvent(incident_id, company_id, 'attachment_removed', `Attachment removed`, user_id);
  }

  async assignIncident(incident_id: string, company_id: string, user_id: string, assigned_to: string) {
    const incident = await incidentsRepo.findById(incident_id, company_id);
    if (!incident) throw new Error('Incident not found');
    const updated = await incidentsRepo.assignIncident(incident_id, company_id, assigned_to);
    await incidentsRepo.addEvent(incident_id, company_id, 'assigned', `Incident assigned`, user_id);
    return updated;
  }

  async resolveIncident(incident_id: string, company_id: string, user_id: string, resolution_notes: string) {
    const incident = await incidentsRepo.findById(incident_id, company_id);
    if (!incident) throw new Error('Incident not found');
    const updated = await incidentsRepo.resolveIncident(incident_id, company_id, resolution_notes);
    await incidentsRepo.addEvent(incident_id, company_id, 'resolved', `Incident resolved: ${resolution_notes}`, user_id);
    await eventBus.emitEvent(EVENTS.INCIDENT_RESOLVED, { incident_id, company_id, resolved_by: user_id });
    return updated;
  }
}

export const incidentsService = new IncidentsService();
