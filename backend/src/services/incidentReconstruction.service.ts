import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

export class IncidentReconstructionService {
  async create(company_id: string, user_id: string, data: { incident_id: string; house_id: string; lead_investigator?: string }) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO incident_reconstruction (id, company_id, house_id, incident_id, lead_investigator, status)
       VALUES ($1, $2, $3, $4, $5, 'Draft') RETURNING *`,
      [id, company_id, data.house_id, data.incident_id, data.lead_investigator || user_id]
    );
    return result.rows[0];
  }

  async findById(id: string, company_id: string) {
    const result = await query(
      `SELECT ir.*, h.name as house_name, i.incident_type, i.severity as incident_severity,
              u.first_name || ' ' || u.last_name as investigator_name
       FROM incident_reconstruction ir
       JOIN houses h ON h.id = ir.house_id
       JOIN incidents i ON i.id = ir.incident_id
       JOIN users u ON u.id = ir.lead_investigator
       WHERE ir.id = $1 AND ir.company_id = $2`,
      [id, company_id]
    );
    return result.rows[0];
  }

  async updateSection(id: string, company_id: string, sectionData: Record<string, any>) {
    const existing = await this.findById(id, company_id);
    if (!existing) throw new Error('Reconstruction not found');
    if (existing.status === 'Completed' || existing.status === 'Approved') {
      throw new Error('Governance Block: Record is locked and cannot be modified.');
    }

    const setClauses: string[] = [];
    const values: any[] = [id, company_id];
    let i = 3;

    for (const [key, value] of Object.entries(sectionData)) {
      if (key.startsWith('s') && parseInt(key.substring(1)) <= 17) {
        setClauses.push(`${key} = $${i++}`);
        values.push(value);
      }
    }

    if (setClauses.length === 0) return existing;

    const sql = `UPDATE incident_reconstruction SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $1 AND company_id = $2 RETURNING *`;
    const result = await query(sql, values);
    return result.rows[0];
  }

  async linkPulses(id: string, company_id: string, pulseIds: string[]) {
    // 1. Clear existing links for simplicity or append? Instruction says "linkPulseEntries".
    // We'll use a sync pattern: delete and re-insert.
    await query('DELETE FROM incident_reconstruction_pulses WHERE reconstruction_id = $1', [id]);
    
    for (const pulseId of pulseIds) {
      await query(
        'INSERT INTO incident_reconstruction_pulses (reconstruction_id, pulse_id) VALUES ($1, $2)',
        [id, pulseId]
      );
    }
    
    return { success: true, count: pulseIds.length };
  }

  async getTimeline(id: string, company_id: string) {
    const result = await query(
      `SELECT p.entry_date, p.entry_time, p.signal_type, p.description, p.severity, p.risk_domain
       FROM incident_reconstruction_pulses irp
       JOIN governance_pulses p ON p.id = irp.pulse_id
       WHERE irp.reconstruction_id = $1
       ORDER BY p.entry_date ASC, p.entry_time ASC`,
      [id]
    );
    return result.rows;
  }

  async complete(id: string, company_id: string, user_id: string) {
    const ir = await this.findById(id, company_id);
    if (!ir) throw new Error('Reconstruction not found');

    // Validation: Ensure mandatory sections for OrdinCore (Spec Requirement)
    const mandatory = ['s2_incident_summary', 's6_contributing_factors', 's7_control_weaknesses', 's15_narrative_summary'];
    for (const field of mandatory) {
      if (!ir[field]) throw new Error(`Governance Block: Mandatory section ${field} must be filled before completion.`);
    }

    const result = await query(
      `UPDATE incident_reconstruction 
       SET status = 'Completed', completed_at = NOW(), completed_by = $1, updated_at = NOW()
       WHERE id = $2 AND company_id = $3 RETURNING *`,
      [user_id, id, company_id]
    );
    
    logger.info(`Incident Reconstruction ${id} completed by ${user_id}`);
    return result.rows[0];
  }
}

export const incidentReconstructionService = new IncidentReconstructionService();
