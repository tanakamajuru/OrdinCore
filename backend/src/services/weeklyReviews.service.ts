import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

// export class WeeklyReviewsService {
export class WeeklyReviewsService {
  async validateStepDependency(targetStep: number, existingContent: any) {
    const dependencies: Record<number, string[]> = {
      1: [], // Start
      2: ['step1_scope'],
      3: ['step2_pulses'],
      4: ['step3_repeat_signals'],
      5: ['step3_repeat_signals'], // 4 & 5 follow 3
      6: ['step4_escalating_signals', 'step5_protective_signals'],
      7: ['step6_interpretation'],
      8: ['step7_risks_updated'],
      9: ['step7_risks_updated'],
      10: ['step9_control_failures'],
      11: ['step10_decisions'],
      12: ['step6_interpretation', 'step7_risks_updated', 'step8_trajectory_changes', 'step9_control_failures', 'step10_decisions', 'step11_actions'],
      13: ['step12_overall_position']
    };

    const requiredFields = dependencies[targetStep] || [];
    for (const field of requiredFields) {
      if (!existingContent || !existingContent[field]) {
        throw new Error(`Governance Block: Mandatory field '${field}' must be completed before proceeding to Step ${targetStep}.`);
      }
    }
  }

  async save(company_id: string, user_id: string, data: { house_id: string; week_ending: string; content: any; step_reached?: number; status?: string }) {
    // 1. Fetch Existing
    const existing = await query(
      'SELECT id, status, content, step_reached FROM weekly_reviews WHERE company_id = $1 AND house_id = $2 AND week_ending = $3',
      [company_id, data.house_id, data.week_ending]
    );

    if (existing.rows[0]?.status === 'LOCKED') {
      throw new Error('Governance Integrity Rule: This weekly review is locked and cannot be modified.');
    }

    // 2. Validate Sequence (if step is moving forward)
    const currentStep = existing.rows[0]?.step_reached || 1;
    const targetStep = data.step_reached || currentStep;
    const mergedContent = { ...(existing.rows[0]?.content || {}), ...(data.content || {}) };

    if (targetStep > currentStep) {
      // Validate every step between current and target
      for (let s = currentStep + 1; s <= targetStep; s++) {
        await this.validateStepDependency(s, mergedContent);
      }
    }

    // 3. Prevent skipping previous week (Existing Lock)
    const prevWeekStr = new Date(new Date(data.week_ending).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const prevReview = await query(
      'SELECT status FROM weekly_reviews WHERE company_id = $1 AND house_id = $2 AND week_ending = $3',
      [company_id, data.house_id, prevWeekStr]
    );
    if (prevReview.rows[0] && prevReview.rows[0].status !== 'LOCKED') {
      throw new Error(`Governance Block: Previous weekly review (${prevWeekStr}) is not yet LOCKED.`);
    }

    const id = existing.rows[0]?.id || uuidv4();
    const result = await query(
      `INSERT INTO weekly_reviews (id, company_id, house_id, week_ending, content, step_reached, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (house_id, week_ending) DO UPDATE
       SET content = $5, step_reached = $6, status = COALESCE($7, weekly_reviews.status), updated_at = NOW()
       RETURNING *`,
      [id, company_id, data.house_id, data.week_ending, JSON.stringify(mergedContent), targetStep, data.status || 'draft', user_id]
    );
    return result.rows[0];
  }

  async complete(id: string, company_id: string, user_id: string) {
    const review = await this.findById(id, company_id);
    if (!review) throw new Error('Review not found');

    if (review.step_reached < 13) {
      throw new Error('Governance Block: Cannot lock review until all 13 steps are completed.');
    }

    const result = await query(
      `UPDATE weekly_reviews SET status = 'LOCKED', completed_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND company_id = $2 RETURNING *`,
      [id, company_id]
    );
    return result.rows[0];
  }

  async prepareReview(company_id: string, house_id: string, week_ending: string) {
    const end = new Date(week_ending);
    const start = new Date(end);
    start.setDate(start.getDate() - 6); // 7 days inclusive

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    // 1. Fetch Signal Clusters (Emerging/Escalated)
    const clusters = await query(
      `SELECT * FROM signal_clusters 
       WHERE house_id = $1 AND company_id = $2 
       AND last_signal_date BETWEEN $3 AND $4`,
      [house_id, company_id, startStr, endStr]
    );

    // 2. Fetch Active Risks
    const risks = await query(
      `SELECT id, risk_title, risk_domain, risk_level, status 
       FROM risks WHERE house_id = $1 AND company_id = $2 
       AND status IN ('Open', 'Escalated')`,
      [house_id, company_id]
    );

    // 3. Fetch Incidents
    const incidents = await query(
      `SELECT id, incident_type, severity, description 
       FROM incidents WHERE house_id = $1 AND company_id = $2 
       AND created_at BETWEEN $3 AND $4`,
      [house_id, company_id, startStr, endStr]
    );

    return {
      week_range: { start: startStr, end: endStr },
      auto_data: {
        clusters: clusters.rows,
        risks: risks.rows,
        incidents: incidents.rows
      },
      narrative_draft: clusters.rows.map(c => `[${c.risk_domain}] ${c.cluster_label}`).join('\n')
    };
  }

  async findByHouse(company_id: string, house_id: string, limit = 10) {
// ...
    const result = await query(
      `SELECT wr.*, u.first_name || ' ' || u.last_name AS created_by_name
       FROM weekly_reviews wr
       JOIN users u ON u.id = wr.created_by
       WHERE wr.company_id = $1 AND wr.house_id = $2
       ORDER BY wr.week_ending DESC LIMIT $3`,
      [company_id, house_id, limit]
    );
    return result.rows;
  }

  async findById(id: string, company_id: string) {
    const result = await query(
      `SELECT wr.*, u.first_name || ' ' || u.last_name AS created_by_name
       FROM weekly_reviews wr
       JOIN users u ON u.id = wr.created_by
       WHERE wr.id = $1 AND wr.company_id = $2`,
      [id, company_id]
    );
    return result.rows[0];
  }
}

export const weeklyReviewsService = new WeeklyReviewsService();
