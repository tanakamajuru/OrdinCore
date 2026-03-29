import { incidentsRepo } from '../repositories/incidents.repo';
import { eventBus, EVENTS } from '../events/eventBus';

export class IncidentsService {
  async create(company_id: string, created_by: string, data: {
    house_id: string; title: string; description: string; severity?: string; occurred_at: Date;
    location?: string; immediate_action?: string; category_id?: string; assigned_to?: string;
    persons_involved?: string[]; follow_up_required?: boolean;
  }) {
    const incident = await incidentsRepo.create({ company_id, created_by, ...data });

    // Add creation event to timeline
    await incidentsRepo.addEvent(incident.id, company_id, {
      event_type: 'created',
      title: 'Incident Reported',
      description: `Incident "${incident.title}" was reported and logged`,
      metadata: { severity: incident.severity, category: incident.category_id },
      created_by
    });

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

    // [GOVERNANCE] Locked Means Locked
    if (incident.status === 'resolved' || incident.status === 'closed') {
      throw new Error('This incident is resolved/closed and cannot be modified (Governance Integrity Rule Section 7.2)');
    }

    const updated = await incidentsRepo.update(id, company_id, data);

    // Add update event to timeline
    await incidentsRepo.addEvent(id, company_id, {
      event_type: 'updated',
      title: 'Incident Updated',
      description: 'Incident details were updated',
      metadata: { updated_fields: Object.keys(data) },
      created_by: data.updated_by as string || incident.created_by
    });

    return updated;
  }

  async delete(id: string, company_id: string) {
    // [GOVERNANCE] No Deletion Implementation
    throw new Error('Hard deletion is prohibited for governance records (Governance Integrity Rule Section 7.1). Please resolve or close the incident instead.');
  }

  async getTimeline(incident_id: string, company_id: string) {
    const incident = await incidentsRepo.findById(incident_id, company_id);
    if (!incident) throw new Error('Incident not found');
    return incidentsRepo.getTimeline(incident_id, company_id);
  }

  async getGovernanceTimeline(incident_id: string, company_id: string) {
    const incident = await incidentsRepo.findById(incident_id, company_id);
    if (!incident) throw new Error('Incident not found');
    return incidentsRepo.getGovernanceTimeline(incident_id, company_id);
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
    return attachment;
  }

  async removeAttachment(incident_id: string, company_id: string, user_id: string, attachment_id: string) {
    const incident = await incidentsRepo.findById(incident_id, company_id);
    if (!incident) throw new Error('Incident not found');
    await incidentsRepo.removeAttachment(attachment_id, incident_id, company_id);
  }

  async assignIncident(incident_id: string, company_id: string, user_id: string, assigned_to: string) {
    const incident = await incidentsRepo.findById(incident_id, company_id);
    if (!incident) throw new Error('Incident not found');
    const updated = await incidentsRepo.assignIncident(incident_id, company_id, assigned_to);
    return updated;
  }

  async resolveIncident(incident_id: string, company_id: string, user_id: string, resolution_notes: string) {
    const incident = await incidentsRepo.findById(incident_id, company_id);
    if (!incident) throw new Error('Incident not found');

    // [GOVERNANCE] Locked Means Locked
    if (incident.status === 'resolved' || incident.status === 'closed') {
      throw new Error('This incident is already resolved/closed (Governance Integrity Rule Section 7.2)');
    }

    const updated = await incidentsRepo.resolveIncident(incident_id, company_id, resolution_notes);

    // Add resolution event to timeline
    await incidentsRepo.addEvent(incident_id, company_id, {
      event_type: 'resolved',
      title: 'Incident Resolved',
      description: resolution_notes || 'Incident was resolved',
      metadata: { resolved_by: user_id, resolved_at: new Date() },
      created_by: user_id
    });

    await eventBus.emitEvent(EVENTS.INCIDENT_RESOLVED, { incident_id, company_id, resolved_by: user_id });
    return updated;
  }
}

export const incidentsService = new IncidentsService();
