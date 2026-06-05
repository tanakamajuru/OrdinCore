import { query } from '../config/database';

export interface GovernanceReviewInput {
  service_id?: string;
  risk_id?: string;
  escalation_id?: string;
  review_type: 'RM_REVIEW' | 'DIRECTOR_REVIEW' | 'RI_ASSURANCE_REVIEW' | 'WEEKLY_REVIEW';
  what_is_happening: string;
  decision: 'Monitor' | 'Create Action' | 'Escalate' | 'Close' | 'Reopen';
  escalation_required?: boolean;
  action_required?: boolean;
  evidence?: string;
}

/**
 * Governance review service (spec module 5).
 * Records the leadership judgement (RM/Director/RI) behind every decision.
 */
export class GovernanceReviewsService {
  async create(companyId: string, userId: string, dto: GovernanceReviewInput) {
    if (!dto.what_is_happening || dto.what_is_happening.trim().length < 5) {
      throw new Error('A description of what is happening is required.');
    }
    if (!dto.decision) throw new Error('A decision is required.');

    const result = await query(
      `INSERT INTO governance_reviews
        (company_id, service_id, risk_id, escalation_id, review_type, reviewed_by,
         what_is_happening, decision, escalation_required, action_required, evidence)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [companyId, dto.service_id || null, dto.risk_id || null, dto.escalation_id || null,
       dto.review_type, userId, dto.what_is_happening, dto.decision,
       dto.escalation_required ?? false, dto.action_required ?? false, dto.evidence || null]
    );

    // Stamp the linked risk so the strategic dashboard reflects the review.
    if (dto.risk_id) {
      await query(
        `UPDATE risks SET last_governance_review_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND company_id = $2`,
        [dto.risk_id, companyId]
      );
    }

    return result.rows[0];
  }

  async list(companyId: string, filters: { risk_id?: string; escalation_id?: string; review_type?: string } = {}) {
    const conditions = ['gr.company_id = $1'];
    const params: unknown[] = [companyId];
    let idx = 2;
    if (filters.risk_id) { conditions.push(`gr.risk_id = $${idx++}`); params.push(filters.risk_id); }
    if (filters.escalation_id) { conditions.push(`gr.escalation_id = $${idx++}`); params.push(filters.escalation_id); }
    if (filters.review_type) { conditions.push(`gr.review_type = $${idx++}`); params.push(filters.review_type); }

    const result = await query(
      `SELECT gr.*, u.first_name || ' ' || u.last_name AS reviewed_by_name,
              h.name AS service_name, r.title AS risk_title
       FROM governance_reviews gr
       JOIN users u ON u.id = gr.reviewed_by
       LEFT JOIN houses h ON h.id = gr.service_id
       LEFT JOIN risks r ON r.id = gr.risk_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY gr.review_date DESC`,
      params
    );
    return result.rows;
  }

  async getById(id: string, companyId: string) {
    const result = await query(
      `SELECT gr.*, u.first_name || ' ' || u.last_name AS reviewed_by_name
       FROM governance_reviews gr
       JOIN users u ON u.id = gr.reviewed_by
       WHERE gr.id = $1 AND gr.company_id = $2`,
      [id, companyId]
    );
    if (!result.rows[0]) throw new Error('Governance review not found');
    return result.rows[0];
  }

  /**
   * Themes awaiting an RM governance review: open strategic risks that have
   * never been reviewed, or whose last review is older than 7 days.
   */
  async getQueue(companyId: string) {
    const result = await query(
      `SELECT r.id AS risk_id,
              COALESCE(r.strategic_theme, r.title) AS theme,
              r.trend,
              r.severity,
              r.house_id AS service_id,
              h.name AS service_name,
              (SELECT COUNT(*) FROM risk_signal_links rsl WHERE rsl.risk_id = r.id) AS signal_count,
              r.last_governance_review_at,
              r.created_at AS since,
              EXTRACT(DAY FROM NOW() - COALESCE(r.last_governance_review_at, r.created_at))::int AS days_since_review
       FROM risks r
       LEFT JOIN houses h ON h.id = r.house_id
       WHERE r.company_id = $1
         AND r.status NOT IN ('Closed')
         AND (r.last_governance_review_at IS NULL OR r.last_governance_review_at < NOW() - INTERVAL '7 days')
       ORDER BY
         CASE r.severity WHEN 'Critical' THEN 0 WHEN 'High' THEN 1 WHEN 'Moderate' THEN 2 WHEN 'Medium' THEN 2 ELSE 3 END,
         r.last_governance_review_at NULLS FIRST`,
      [companyId]
    );
    return result.rows;
  }
}

export const governanceReviewsService = new GovernanceReviewsService();
