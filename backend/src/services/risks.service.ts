import { risksRepo } from '../repositories/risks.repo';
import { eventBus, EVENTS } from '../events/eventBus';
import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export class RisksService {
  async create(company_id: string, created_by: string, data: {
    house_id: string; title: string; description?: string; severity?: string; category_id?: string;
    likelihood?: number; impact?: number; assigned_to?: string; review_due_date?: Date;
    source_cluster_id?: string; status?: string; trajectory?: string;
    metadata?: any;
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

    // [GOVERNANCE] Locked Means Locked
    if (risk.status === 'escalated' || risk.status === 'closed' || risk.status === 'resolved') {
      throw new Error('This record is locked and cannot be modified (Governance Integrity Rule Section 7.2)');
    }

    const updated = await risksRepo.update(id, company_id, data);
    await risksRepo.addEvent(id, company_id, 'updated', `Risk updated`, user_id);

    // [ENGINE] Automated Escalation Trigger
    if (data.severity) {
      await this.checkAutoEscalation(updated);
    }

    return updated;
  }

  async delete(id: string, company_id: string, user_id: string) {
    // [GOVERNANCE] No Deletion Implementation
    throw new Error('Hard deletion is prohibited for governance records (Governance Integrity Rule Section 7.1). Please resolve or close the risk instead.');
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

  async findAllActions(company_id: string, filters: any = {}) {
    return risksRepo.findAllActions(company_id, filters);
  }

  async escalate(risk_id: string, company_id: string, escalated_by: string, data: { escalated_to: string; reason: string }) {
    const risk = await risksRepo.findById(risk_id, company_id);
    if (!risk) throw new Error('Risk not found');

    if (risk.status.toLowerCase() === 'escalated') {
      throw new Error('Risk is already escalated');
    }

    // Find default target if missing
    let target = data.escalated_to;
    if (!target) {
      const adminRes = await query(
        "SELECT id FROM users WHERE company_id = $1 AND role IN ('ADMIN', 'SUPER_ADMIN') LIMIT 1",
        [company_id]
      );
      target = adminRes.rows[0]?.id || risk.created_by;
    }

    // Create escalation record
    const id = uuidv4();
    await query(
      `INSERT INTO escalations (id, company_id, risk_id, escalated_by, escalated_to, reason, status)
       VALUES ($1,$2,$3,$4,$5,$6,'Pending')`,
      [id, company_id, risk_id, escalated_by, target, data.reason]
    );

    await risksRepo.update(risk_id, company_id, { status: 'Escalated' });
    await risksRepo.addEvent(risk_id, company_id, 'Escalated', `Risk escalated: ${data.reason}`, escalated_by);
    await eventBus.emitEvent(EVENTS.RISK_ESCALATED, { risk_id, company_id, escalated_by, escalated_to: target });

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

  async updateActionStatus(action_id: string, risk_id: string, company_id: string, user_id: string, status: string) {
    const action = await risksRepo.getActionById(action_id, company_id);
    if (!action || action.risk_id !== risk_id) throw new Error('Action not found');

    const updated = await risksRepo.updateAction(action_id, company_id, { status });
    await risksRepo.addEvent(risk_id, company_id, 'action_updated', `Action "${action.title}" status changed to ${status}`, user_id);
    
    if (status === 'Completed') {
      await risksRepo.updateAction(action_id, company_id, { completed_at: new Date() });
    }

    return updated;
  }

  async verifyAction(action_id: string, risk_id: string, company_id: string, user: { id: string; role: string }, data: { notes: string }) {
    const action = await risksRepo.getActionById(action_id, company_id);
    if (!action || action.risk_id !== risk_id) throw new Error('Action not found');

    // [GOVERNANCE] Four-Eyes Principle Section 8.1
    if (action.created_by === user.id) {
      throw new Error('Independent Verification Required: A user cannot verify an action they created themselves (Governance Integrity Rule Section 8.1).');
    }

    const updateData: Record<string, any> = { verification_notes: data.notes };

    if (user.role === 'REGISTERED_MANAGER') {
      updateData.verified_by_rm = user.id;
      updateData.verified_at_rm = new Date();
    } else if (user.role === 'DIRECTOR' || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      updateData.verified_by_ri = user.id;
      updateData.verified_at_ri = new Date();
    } else {
      throw new Error('Unauthorized: Only Managers or Directors can verify governance actions.');
    }

    const updated = await risksRepo.updateAction(action_id, company_id, updateData);
    await risksRepo.addEvent(risk_id, company_id, 'action_verified', `Action "${action.title}" verified by ${user.role}`, user.id);

    return updated;
  }

  async promoteFromCluster(company_id: string, user_id: string, data: {
    cluster_id: string; title: string; severity: string; trajectory: string;
    description: string; house_id: string; category_id: string; likelihood: number; impact: number;
  }) {
    const clusterRes = await query(
      `SELECT id, signal_count, first_signal_date, last_signal_date FROM signal_clusters 
       WHERE id = $1 AND company_id = $2`,
      [data.cluster_id, company_id]
    );
    if (clusterRes.rows.length === 0) throw new Error('Source cluster not found');
    const cluster = clusterRes.rows[0];

    const risk = await this.create(company_id, user_id, {
      ...data,
      source_cluster_id: data.cluster_id,
      status: 'Open',
      linked_person: cluster.linked_person
    });

    // Update cluster status to 'Escalated' or 'Confirmed'
    await query('UPDATE signal_clusters SET cluster_status = $1, linked_risk_id = $2 WHERE id = $3', 
      ['Escalated', risk.id, data.cluster_id]);

    await risksRepo.addEvent(risk.id, company_id, 'Promotion', `Promoted from Signal Cluster ${data.cluster_id}`, user_id);
    
    return risk;
  }

  async promoteFromCandidate(company_id: string, user_id: string, data: {
    candidate_id: string; title: string; severity: string; trajectory: string;
    description: string; house_id: string; category_id: string; likelihood: number; impact: number;
    reason?: string;
  }) {
    const candidateRes = await query(
      `SELECT id, risk_domain FROM risk_candidates 
       WHERE id = $1 AND company_id = $2`,
      [data.candidate_id, company_id]
    );
    if (candidateRes.rows.length === 0) throw new Error('Risk candidate not found');

    const risk = await this.create(company_id, user_id, {
      ...data,
      status: 'Open',
      metadata: { promotion_reason: data.reason },
      linked_person: candidateRes.rows[0].linked_person
    });

    // Update candidate status
    await query('UPDATE risk_candidates SET status = $1, linked_risk_id = $2 WHERE id = $3', 
      ['Promoted', risk.id, data.candidate_id]);

    await risksRepo.addEvent(risk.id, company_id, 'Promotion', `Promoted from Risk Candidate ${data.candidate_id}. Reason: ${data.reason}`, user_id);
    
    return risk;
  }

  async dismissCandidate(company_id: string, user_id: string, candidate_id: string, reason: string) {
    const candidateRes = await query(
      `SELECT id FROM risk_candidates 
       WHERE id = $1 AND company_id = $2`,
      [candidate_id, company_id]
    );
    if (candidateRes.rows.length === 0) throw new Error('Risk candidate not found');

    await query(
      `UPDATE risk_candidates 
       SET status = 'Dismissed', dismissal_reason = $1
       WHERE id = $2`,
      [reason, candidate_id]
    );
  }

  private async checkAutoEscalation(risk: any) {
    // Rule 1: High/Critical severity and no progress in 24h (Simple version: trigger immediately on creation/update to high)
    if (risk.severity === 'High' || risk.severity === 'Critical') {
        await this.triggerEscalation(risk, `Automated escalation: ${risk.severity.toUpperCase()} risk detected.`);
    }

    // Rule 2: Open > 14 days (Defensible Governance)
    const createdAt = new Date(risk.created_at);
    const now = new Date();
    const diffDays = Math.ceil((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays > 14 && risk.status === 'Open') {
        await this.triggerEscalation(risk, `Defensible Governance Rule: Risk open for more than 14 days without resolution.`);
    }
  }

  private async triggerEscalation(risk: any, reason: string) {
    // Check if already escalated
    const existing = await query(
      "SELECT id FROM escalations WHERE risk_id = $1 AND status = 'Pending'",
      [risk.id]
    );
    if (existing.rows.length > 0) return;

    // Find the first Director of the company
    const directorRes = await query(
      "SELECT id FROM users WHERE company_id = $1 AND role = 'DIRECTOR' LIMIT 1",
      [risk.company_id]
    );
    
    // Fallback to Admin or Creator if no Director exists
    let escalated_to = directorRes.rows[0]?.id;
    if (!escalated_to) {
        const adminRes = await query(
            "SELECT id FROM users WHERE company_id = $1 AND role IN ('ADMIN', 'SUPER_ADMIN') LIMIT 1",
            [risk.company_id]
        );
        escalated_to = adminRes.rows[0]?.id || risk.created_by;
    }

    await this.escalate(risk.id, risk.company_id, risk.created_by, {
      escalated_to,
      reason
    });
  }

  async updateTrajectoryFromActions(risk_id: string, company_id: string) {

    // 1. Fetch last 2 effective/ineffective ratings for COMPLETED actions
    const ratings = await query(
      `SELECT effectiveness FROM risk_actions 
       WHERE risk_id = $1 AND company_id = $2 
       AND status = 'Completed' AND effectiveness IS NOT NULL
       ORDER BY completed_at DESC LIMIT 2`,
      [risk_id, company_id]
    );

    if (ratings.rows.length < 2) return;

    const r1 = ratings.rows[0].effectiveness;
    const r2 = ratings.rows[1].effectiveness;

    let newTrajectory: string | null = null;
    let governanceNote: string | null = null;

    if (r1 === 'Effective' && r2 === 'Effective') {
      newTrajectory = 'Improving';
    } else if (r1 === 'Ineffective' && r2 === 'Ineffective') {
      newTrajectory = 'Deteriorating';
      governanceNote = 'Critical Governance Concern: Two consecutive ineffective control actions detected.';
    }

    if (newTrajectory) {
      await risksRepo.update(risk_id, company_id, { trajectory: newTrajectory });
      await risksRepo.addEvent(risk_id, company_id, 'trajectory_auto_update', 
        `Trajectory automatically updated to ${newTrajectory} based on action effectiveness.${governanceNote ? ' ' + governanceNote : ''}`, 
        'SYSTEM');
      
      if (governanceNote) {
        await eventBus.emitEvent(EVENTS.GOVERNANCE_CONCERN, { risk_id, company_id, note: governanceNote });
      }
    }
  }
}

export const risksService = new RisksService();
