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
  }
}

export const incidentsService = new IncidentsService();
