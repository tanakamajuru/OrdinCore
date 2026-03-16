import { risksRepo } from '../repositories/risks.repo';
import { eventBus, EVENTS } from '../events/eventBus';
import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export class RisksService {
  async create(company_id: string, created_by: string, data: {
    house_id: string; title: string; description?: string; severity?: string; category_id?: string;
    likelihood?: number; impact?: number; assigned_to?: string; review_due_date?: Date;
  }) {
    const risk = await risksRepo.create({ company_id, created_by, ...data });
    await risksRepo.addEvent(risk.id, company_id, 'created', 'Risk created', created_by);
    await eventBus.emitEvent(EVENTS.RISK_CREATED, { risk_id: risk.id, company_id, created_by, severity: risk.severity });
    
    // [ENGINE] Automated Escalation Trigger
    await this.checkAutoEscalation(risk);
    
    return risk;
  }

  async findAll(company_id: string, filters: Record<string, unknown> = {}, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const [risks, total] = await Promise.all([
      risksRepo.findByCompany(company_id, filters, limit, offset),
      risksRepo.countByCompany(company_id, filters),
    ]);
    return { risks, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findById(id: string, company_id: string) {
    const risk = await risksRepo.findById(id, company_id);
    if (!risk) throw new Error('Risk not found');
    return risk;
  }

  async update(id: string, company_id: string, user_id: string, data: Record<string, unknown>) {
    const risk = await risksRepo.findById(id, company_id);
    if (!risk) throw new Error('Risk not found');
    const updated = await risksRepo.update(id, company_id, data);
    await risksRepo.addEvent(id, company_id, 'updated', `Risk updated`, user_id);
    
    // [ENGINE] Automated Escalation Trigger
    if (data.severity) {
      await this.checkAutoEscalation(updated);
    }
    
    return updated;
  }

  async delete(id: string, company_id: string, user_id: string) {
    const risk = await risksRepo.findById(id, company_id);
    if (!risk) throw new Error('Risk not found');
    await risksRepo.delete(id, company_id);
    await risksRepo.addEvent(id, company_id, 'closed', 'Risk closed', user_id);
  }

  async addEvent(risk_id: string, company_id: string, user_id: string, data: { event_type: string; description: string }) {
    const risk = await risksRepo.findById(risk_id, company_id);
    if (!risk) throw new Error('Risk not found');
    return risksRepo.addEvent(risk_id, company_id, data.event_type, data.description, user_id);
  }

  async addAction(risk_id: string, company_id: string, user_id: string, data: { title: string; description?: string; assigned_to?: string; due_date?: Date }) {
    const risk = await risksRepo.findById(risk_id, company_id);
    if (!risk) throw new Error('Risk not found');
    return risksRepo.addAction(risk_id, company_id, { ...data, created_by: user_id });
  }

  async getActions(risk_id: string, company_id: string) {
    const risk = await risksRepo.findById(risk_id, company_id);
    if (!risk) throw new Error('Risk not found');
    return risksRepo.getActions(risk_id, company_id);
  }

  async escalate(risk_id: string, company_id: string, escalated_by: string, data: { escalated_to: string; reason: string }) {
    const risk = await risksRepo.findById(risk_id, company_id);
    if (!risk) throw new Error('Risk not found');

    // Create escalation record
    const id = uuidv4();
    await query(
      `INSERT INTO escalations (id, company_id, risk_id, escalated_by, escalated_to, reason, status)
       VALUES ($1,$2,$3,$4,$5,$6,'pending')`,
      [id, company_id, risk_id, escalated_by, data.escalated_to, data.reason]
    );

    await risksRepo.update(risk_id, company_id, { status: 'escalated' });
    await risksRepo.addEvent(risk_id, company_id, 'escalated', `Risk escalated: ${data.reason}`, escalated_by);
    await eventBus.emitEvent(EVENTS.RISK_ESCALATED, { risk_id, company_id, escalated_by, escalated_to: data.escalated_to });

    return { escalation_id: id, message: 'Risk escalated successfully' };
  }

  async getTimeline(risk_id: string, company_id: string) {
    const risk = await risksRepo.findById(risk_id, company_id);
    if (!risk) throw new Error('Risk not found');
    return risksRepo.getTimeline(risk_id, company_id);
  }

  async getCategories(company_id: string) {
    return risksRepo.getCategories(company_id);
  }

  async createCategory(company_id: string, user_id: string, data: { name: string; description?: string; color?: string }) {
    return risksRepo.createCategory(company_id, { ...data, created_by: user_id });
  }

  async getAttachments(risk_id: string, company_id: string) {
    const risk = await risksRepo.findById(risk_id, company_id);
    if (!risk) throw new Error('Risk not found');
    return risksRepo.getAttachments(risk_id, company_id);
  }

  async addAttachment(risk_id: string, company_id: string, user_id: string, data: { file_name: string; file_url: string; file_type?: string; file_size?: number }) {
    const risk = await risksRepo.findById(risk_id, company_id);
    if (!risk) throw new Error('Risk not found');
    const attachment = await risksRepo.addAttachment(risk_id, company_id, { ...data, uploaded_by: user_id });
    await risksRepo.addEvent(risk_id, company_id, 'attachment_added', `Attachment added: ${data.file_name}`, user_id);
    return attachment;
  }

  async removeAttachment(risk_id: string, company_id: string, user_id: string, attachment_id: string) {
    const risk = await risksRepo.findById(risk_id, company_id);
    if (!risk) throw new Error('Risk not found');
    await risksRepo.removeAttachment(attachment_id, risk_id, company_id);
    await risksRepo.addEvent(risk_id, company_id, 'attachment_removed', `Attachment removed`, user_id);
  }

  async assignRisk(risk_id: string, company_id: string, user_id: string, assigned_to: string) {
    const risk = await risksRepo.findById(risk_id, company_id);
    if (!risk) throw new Error('Risk not found');
    const updated = await risksRepo.assignRisk(risk_id, company_id, assigned_to);
    await risksRepo.addEvent(risk_id, company_id, 'assigned', `Risk assigned`, user_id);
    return updated;
  }

  async getAssignedToMe(company_id: string, user_id: string, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const filters = { assigned_to: user_id, status: 'open' };
    const [risks, total] = await Promise.all([
      risksRepo.findByCompany(company_id, filters, limit, offset),
      risksRepo.countByCompany(company_id, filters),
    ]);
    return { risks, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async updateStatus(risk_id: string, company_id: string, user_id: string, status: string) {
    const risk = await risksRepo.findById(risk_id, company_id);
    if (!risk) throw new Error('Risk not found');
    const updated = await risksRepo.updateStatus(risk_id, company_id, status);
    await risksRepo.addEvent(risk_id, company_id, 'status_updated', `Status changed to ${status}`, user_id);
    if (status === 'closed' || status === 'resolved') {
      await risksRepo.update(risk_id, company_id, { resolved_at: new Date() });
    }
    return updated;
  }

  private async checkAutoEscalation(risk: any) {
    if (risk.severity === 'high' || risk.severity === 'critical') {
      // Check if already escalated
      const existing = await query(
        "SELECT id FROM escalations WHERE risk_id = $1 AND status = 'pending'",
        [risk.id]
      );
      if (existing.rows.length === 0) {
        await this.escalate(risk.id, risk.company_id, risk.created_by, {
          escalated_to: 'SYSTEM',
          reason: `Automated escalation: ${risk.severity.toUpperCase()} risk detected.`
        });
      }
    }
  }
}

export const risksService = new RisksService();
