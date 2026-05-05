import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export class RiGovernanceService {
  async getDashboardOverview(company_id: string) {
    // 1. OSP Ladder (Site ranking + Delta)
    const ospLadder = await query(
      `SELECT h.id as house_id, h.name as house_name, 
              wr.overall_position, wr.id as weekly_review_id,
              CASE 
                WHEN wr.overall_position = 'Stable' THEN 1
                WHEN wr.overall_position = 'Watch' THEN 2
                WHEN wr.overall_position = 'Concern' THEN 3
                WHEN wr.overall_position = 'Escalating' THEN 4
                WHEN wr.overall_position = 'Serious Concern' THEN 5
                ELSE 0
              END as position_rank
       FROM houses h
       LEFT JOIN LATERAL (
         SELECT id, overall_position, week_ending
         FROM weekly_reviews 
         WHERE house_id = h.id 
         ORDER BY week_ending DESC LIMIT 1
       ) wr ON true
       WHERE h.company_id = $1 AND h.is_active = true
       ORDER BY position_rank DESC, h.name ASC`,
      [company_id]
    );

    // 2. Governance Heatmap (Last 7 days)
    const heatmap = await query(
      `SELECT house_id, house_name, review_date, daily_status, weekly_completed_this_week
       FROM service_governance_compliance_mv
       WHERE company_id = $1 AND review_date >= CURRENT_DATE - 6
       ORDER BY house_name, review_date DESC`,
      [company_id]
    );

    // 3. Action Effectiveness Summary (Cross-site by domain)
    const effectiveness = await query(
      `SELECT r.category_id, rc.name as domain,
              COUNT(*) FILTER (WHERE ae.outcome = 'Effective') as effective_count,
              COUNT(*) FILTER (WHERE ae.outcome = 'Neutral') as neutral_count,
              COUNT(*) FILTER (WHERE ae.outcome = 'Ineffective') as ineffective_count
       FROM action_effectiveness ae
       JOIN risks r ON r.id = ae.risk_id
       JOIN risk_categories rc ON rc.id = r.category_id
       WHERE r.company_id = $1
       GROUP BY r.category_id, rc.name`,
      [company_id]
    );

    // 4. Serious Incidents (Unacknowledged Sign-off feed)
     const incidents = await query(
       `SELECT i.*, h.name as house_name, ra.id as acknowledgement_id
        FROM incidents i
        JOIN houses h ON h.id = i.house_id
        LEFT JOIN ri_acknowledgements ra ON ra.incident_id = i.id
        WHERE i.company_id = $1 AND i.severity IN ('High', 'Critical')
        AND ra.id IS NULL
        ORDER BY i.occurred_at DESC`,
       [company_id]
     );

    // 5. Deputy Cover Metrics
    const deputyCover = await query(
      `SELECT id as house_id, name as house_name, deputy_cover_total_seconds
       FROM houses
       WHERE company_id = $1 AND is_active = true`,
      [company_id]
    );

    return {
      osp_ladder: ospLadder.rows,
      heatmap: heatmap.rows,
      effectiveness: effectiveness.rows,
      serious_incidents: incidents.rows,
      deputy_cover: deputyCover.rows
    };
  }

  async acknowledgeIncident(company_id: string, user_id: string, incident_id: string, data: any) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO ri_acknowledgements (id, incident_id, ri_user_id, acknowledgement_text, is_statutory_notification, statutory_body_reference)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, incident_id, user_id, data.acknowledgement_text, data.is_statutory_notification, data.statutory_body_reference]
    );
    return result.rows[0];
  }

  async createQuery(company_id: string, user_id: string, review_id: string, query_text: string) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO ri_queries (id, weekly_review_id, ri_user_id, query_text)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, review_id, user_id, query_text]
    );
    return result.rows[0];
  }

  async getEvidencePack(company_id: string, house_id: string) {
    // Aggregated forensic data for drill-down
    const signals = await query(
      `SELECT * FROM governance_pulses WHERE house_id = $1 AND company_id = $2 ORDER BY entry_date DESC LIMIT 20`,
      [house_id, company_id]
    );
    
    const risks = await query(
      `SELECT * FROM risks WHERE house_id = $1 AND company_id = $2 AND status != 'Closed'`,
      [house_id, company_id]
    );

    const reviews = await query(
      `SELECT wr.*, q.query_text, q.rm_response_text
       FROM weekly_reviews wr
       LEFT JOIN ri_queries q ON q.weekly_review_id = wr.id
       WHERE wr.house_id = $1 AND wr.company_id = $2
       ORDER BY wr.week_ending DESC LIMIT 4`,
      [house_id, company_id]
    );

    const incidents = await query(
      `SELECT i.*, ra.acknowledged_at
       FROM incidents i
       LEFT JOIN ri_acknowledgements ra ON ra.incident_id = i.id
       WHERE i.house_id = $1 AND i.company_id = $2
       ORDER BY i.occurred_at DESC LIMIT 10`,
      [house_id, company_id]
    );

    return {
      signals: signals.rows,
      risks: risks.rows,
      reviews: reviews.rows,
      incidents: incidents.rows
    };
  }

  async getRmQueries(company_id: string, house_id: string) {
    const result = await query(
      `SELECT q.*, wr.week_ending, wr.governance_narrative
       FROM ri_queries q
       JOIN weekly_reviews wr ON wr.id = q.weekly_review_id
       WHERE wr.house_id = $1 AND wr.company_id = $2 AND q.resolved_at IS NULL
       ORDER BY q.query_sent_at DESC`,
      [house_id, company_id]
    );
    return result.rows;
  }

  async respondToQuery(query_id: string, response_text: string, user_id: string) {
    const result = await query(
      `UPDATE ri_queries 
       SET rm_response_text = $1, resolved_at = NOW(), rm_user_id = $2
       WHERE id = $3 RETURNING *`,
      [response_text, user_id, query_id]
    );
    return result.rows[0];
  }
}

export const riGovernanceService = new RiGovernanceService();
