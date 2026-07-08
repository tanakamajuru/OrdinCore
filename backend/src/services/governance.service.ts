import { auditChecklistService } from './auditChecklist.service';
import { query } from '../config/database';
import { PROMOTION_THRESHOLD } from '../config/governance.constants';

export class GovernanceService {
  async createPulse(company_id: string, data: any) {
    return auditChecklistService.createPulse(company_id, data);
  }

  async findAllPulses(company_id: string, filters: any, page = 1, limit = 50) {
    return auditChecklistService.findAllPulses(company_id, filters, page, limit);
  }

  async findPulseById(id: string, company_id: string) {
    return auditChecklistService.findPulseById(id, company_id);
  }

  async submitAnswers(pulse_id: string, company_id: string, user_id: string, answers: any[]) {
    return auditChecklistService.submitAnswers(pulse_id, company_id, user_id, answers);
  }

  async createTemplate(company_id: string, user_id: string, data: any) {
    return auditChecklistService.createTemplate(company_id, user_id, data);
  }

  async getTemplates(company_id: string) {
    return auditChecklistService.getTemplates(company_id);
  }

  async getTemplateQuestions(template_id: string, company_id: string) {
    return auditChecklistService.getTemplateQuestions(template_id, company_id);
  }

  async addTemplateQuestion(template_id: string, company_id: string, data: any) {
    return auditChecklistService.addTemplateQuestion(template_id, company_id, data);
  }

  async updateTemplateQuestion(question_id: string, template_id: string, company_id: string, data: any) {
    return auditChecklistService.updateTemplateQuestion(question_id, template_id, company_id, data);
  }

  async removeTemplateQuestion(question_id: string, template_id: string, company_id: string) {
    return auditChecklistService.removeTemplateQuestion(question_id, template_id, company_id);
  }

  async getPulseAnswers(pulse_id: string, company_id: string) {
    return auditChecklistService.getPulseAnswers(pulse_id, company_id);
  }

  async updatePulseStatus(pulse_id: string, company_id: string, status: string) {
    return auditChecklistService.updatePulseStatus(pulse_id, company_id, status);
  }

  async checkPulseCompliance(company_id: string) {
    return auditChecklistService.checkPulseCompliance(company_id);
  }

  async generateMissingPulses(company_id: string, house_id?: string, user_id?: string) {
    return auditChecklistService.generateMissingPulses(company_id, house_id, user_id);
  }

  // The signals linked to a cluster (via risk_signal_links) — the evidence behind a pattern.
  async getClusterSignals(company_id: string, clusterId: string) {
    const r = await query(
      `SELECT gp.id, gp.entry_date, gp.entry_time, gp.severity, gp.signal_type, gp.risk_domain,
              gp.related_person, gp.description, gp.pattern_concern, gp.created_at,
              h.name AS house_name
         FROM risk_signal_links rsl
         JOIN governance_pulses gp ON gp.id = rsl.pulse_entry_id
         LEFT JOIN houses h ON h.id = gp.house_id
        WHERE rsl.cluster_id = $1 AND gp.company_id = $2
        ORDER BY gp.entry_date DESC, gp.entry_time DESC`,
      [clusterId, company_id]
    );
    return r.rows;
  }

  async getClusters(company_id: string, filters: any, userRole?: string) {
    // Promotion threshold (≥ this many signals, or one Critical) — exposed on each row
    // so the Patterns view's readiness states and the backend promote guard never disagree.
    // SSOT: shared constant (config/governance.constants).
    let q = `SELECT sc.*, h.name AS house_name,
                    (SELECT array_agg(hh.name ORDER BY hh.name) FROM houses hh WHERE hh.id = ANY(sc.affected_house_ids)) AS affected_house_names,
                    EXISTS (
                      SELECT 1 FROM governance_pulses gp
                       WHERE gp.house_id = sc.house_id AND gp.company_id = sc.company_id
                         AND gp.severity = 'Critical' AND sc.risk_domain = ANY(gp.risk_domain)
                         AND gp.entry_date BETWEEN sc.first_signal_date AND sc.last_signal_date
                    ) AS has_critical
             FROM signal_clusters sc
             LEFT JOIN houses h ON h.id = sc.house_id
             WHERE sc.company_id = $1`;
    const params: any[] = [company_id];
    // Finding D: ?scope=cross_service returns the systemic (leadership) lens. Anything
    // else — including no scope — defaults to the per-service clusters, so every existing
    // screen is unchanged and the systemic tier is strictly opt-in.
    params.push(filters.scope === 'cross_service' ? 'cross_service' : 'person');
    q += ` AND sc.scope = $${params.length}`;
    if (filters.house_id) {
      const houseIds = Array.isArray(filters.house_id) ? filters.house_id : (typeof filters.house_id === 'string' && filters.house_id.includes(',') ? filters.house_id.split(',') : [filters.house_id]);
      params.push(houseIds);
      q += ` AND sc.house_id = ANY($${params.length}::uuid[])`;
    }
    if (filters.status) {
      params.push(filters.status);
      q += ` AND sc.cluster_status = $${params.length}`;
    }
    q += ' ORDER BY sc.last_signal_date DESC';
    const res = await query(q, params);

    // Anonymization for RI/Director roles (§7 Visibility Rule)
    const anonymize = userRole === 'RESPONSIBLE_INDIVIDUAL' || userRole === 'DIRECTOR';
    return res.rows.map(cluster => {
      const c = { ...cluster, promotion_threshold: PROMOTION_THRESHOLD };
      // Finding D (display floor): a single-signal cluster is a "watch", not yet a pattern —
      // let the UI badge/soften it so the board isn't crowded with one-signal cards.
      c.is_watch = (Number(cluster.signal_count) || 0) < 2;
      if (anonymize && c.linked_person) {
        c.linked_person = 'Service user (Redacted)';
      }
      return c;
    });
  }

  async getRiskCandidates(company_id: string, filters: any, page = 1, limit = 5, userRole?: string) {
    let q = `
      SELECT rc.*, 
             sc.trajectory as pattern_trajectory,
             COALESCE(sc.signal_count::text, '0') || ' ' || sc.risk_domain || ' signals detected in last period' as reason
      FROM risk_candidates rc
      LEFT JOIN signal_clusters sc ON rc.cluster_id = sc.id
      WHERE rc.company_id = $1
      -- [DEDUP] An item must appear in exactly one queue. When a person-level
      -- candidate exists for the same house+domain, suppress the redundant
      -- system-level (linked_person IS NULL) candidate. (RM Bug #4.)
      AND NOT (
        rc.linked_person IS NULL AND EXISTS (
          SELECT 1 FROM risk_candidates rc2
           WHERE rc2.company_id = rc.company_id
             AND rc2.house_id = rc.house_id
             AND rc2.risk_domain = rc.risk_domain
             AND rc2.linked_person IS NOT NULL
             AND rc2.status = rc.status
        )
      )
    `;
    const params: any[] = [company_id];
    if (filters.id) {
      params.push(filters.id);
      q += ` AND rc.id = $${params.length}`;
    }
    if (filters.house_id) {
      const houseIds = Array.isArray(filters.house_id) ? filters.house_id : (typeof filters.house_id === 'string' && filters.house_id.includes(',') ? filters.house_id.split(',') : [filters.house_id]);
      params.push(houseIds);
      q += ` AND rc.house_id = ANY($${params.length}::uuid[])`;
    }
    if (filters.status) {
      params.push(filters.status);
      q += ` AND rc.status = $${params.length}`;
    }

    // Count query
    const countRes = await query(`SELECT COUNT(*) FROM (${q}) as sub`, params);
    const total = parseInt(countRes.rows[0].count);

    q += ' ORDER BY rc.created_at DESC';
    
    // Pagination
    params.push(limit);
    q += ` LIMIT $${params.length}`;
    params.push((page - 1) * limit);
    q += ` OFFSET $${params.length}`;

    const res = await query(q, params);

    // Anonymization for RI/Director roles (§7 Visibility Rule)
    const anonymize = userRole === 'RESPONSIBLE_INDIVIDUAL' || userRole === 'DIRECTOR';
    const candidates = res.rows.map(rc => {
      if (anonymize && rc.linked_person) {
        return { ...rc, linked_person: 'Service user (Redacted)' };
      }
      return rc;
    });

    return { candidates, total };
  }

  async getActionEffectiveness(company_id: string, filters: any) {
    try {
      let q = 'SELECT * FROM action_effectiveness WHERE company_id = $1';
      const params: any[] = [company_id];
      if (filters.house_id) {
        const houseIds = Array.isArray(filters.house_id) ? filters.house_id : (typeof filters.house_id === 'string' && filters.house_id.includes(',') ? filters.house_id.split(',') : [filters.house_id]);
        params.push(houseIds);
        q += ` AND house_id = ANY($${params.length}::uuid[])`;
      }
      q += ' ORDER BY calculated_at DESC';
      const res = await query(q, params);
      return res.rows;
    } catch (err) {
      // action_effectiveness table may not exist in all environments
      return [];
    }
  }
}

export const governanceService = new GovernanceService();
