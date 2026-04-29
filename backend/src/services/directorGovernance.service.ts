import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

export class DirectorGovernanceService {
  /**
   * P0: Action effectiveness summary (cross-site)
   * Aggregates from risk_actions for organisational visibility.
   */
  async getActionEffectivenessSummary(companyId: string, dateRange: { start: string; end: string }) {
    const sql = `
      WITH stats AS (
        SELECT 
          h.id as service_id,
          h.name as service_name,
          COALESCE(ra.director_override_outcome::text, ra.rm_override_outcome::text, ra.calculated_outcome::text) as outcome,
          ra.completed_at::date as day,
          r.risk_domain as domain
        FROM risk_actions ra
        JOIN risks r ON r.id = ra.risk_id
        JOIN houses h ON h.id = r.house_id
        WHERE h.company_id = $1
        AND ra.completed_at BETWEEN $2 AND $3
        AND (ra.calculated_outcome IS NOT NULL OR ra.rm_override_outcome IS NOT NULL OR ra.director_override_outcome IS NOT NULL)
      )
      SELECT 
        (SELECT json_build_object(
          'effective', COUNT(*) FILTER (WHERE outcome = 'Effective'),
          'neutral', COUNT(*) FILTER (WHERE outcome = 'Neutral'),
          'ineffective', COUNT(*) FILTER (WHERE outcome = 'Ineffective')
        ) FROM stats) as org_summary,
        
        (SELECT json_agg(comparison) FROM (
          SELECT 
            service_name,
            COUNT(*) FILTER (WHERE outcome = 'Effective') as effective,
            COUNT(*) FILTER (WHERE outcome = 'Neutral') as neutral,
            COUNT(*) FILTER (WHERE outcome = 'Ineffective') as ineffective
          FROM stats
          GROUP BY service_name
        ) comparison) as service_comparison,
        
        (SELECT json_agg(domain_stats) FROM (
          SELECT 
            domain,
            COUNT(*) FILTER (WHERE outcome = 'Effective') as effective,
            COUNT(*) FILTER (WHERE outcome = 'Neutral') as neutral,
            COUNT(*) FILTER (WHERE outcome = 'Ineffective') as ineffective
          FROM stats
          GROUP BY domain
        ) domain_stats) as domain_analysis,
        
        (SELECT json_agg(trend) FROM (
          SELECT 
            day,
            COUNT(*) FILTER (WHERE outcome = 'Effective') as effective,
            COUNT(*) FILTER (WHERE outcome = 'Ineffective') as ineffective
          FROM stats
          GROUP BY day
          ORDER BY day ASC
        ) trend) as daily_trend
    `;

    // logger.info(`Executing effectiveness summary SQL: ${sql}`);
    const res = await query(sql, [companyId, dateRange.start, dateRange.end]);
    return res.rows[0] || {
      org_summary: { effective: 0, neutral: 0, ineffective: 0 },
      service_comparison: [],
      domain_analysis: [],
      daily_trend: []
    };
  }

  /**
   * P0: Control failure detection logic (Forensic Rule Engine)
   */
  async detectControlFailures(companyId: string) {
    logger.info(`Starting control failure detection for company ${companyId}`);
    
    // 1. Ineffective actions threshold (≥2 on same risk within 14 days)
    const ineffectiveSql = `
      SELECT ra.risk_id, r.house_id as service_id, COUNT(*) as count
      FROM risk_actions ra
      JOIN risks r ON r.id = ra.risk_id
      WHERE r.company_id = $1
      AND COALESCE(ra.director_override_outcome::text, ra.rm_override_outcome::text, ra.calculated_outcome::text) = 'Ineffective'
      AND ra.completed_at >= NOW() - INTERVAL '14 days'
      GROUP BY ra.risk_id, r.house_id
      HAVING COUNT(*) >= 2
    `;
    const ineffectiveRes = await query(ineffectiveSql, [companyId]);
    
    for (const row of ineffectiveRes.rows) {
      await this.createControlFailureFlag({
        service_id: row.service_id,
        risk_id: row.risk_id,
        failure_type: 'ineffective_actions',
        threshold_trigger: `${row.count} ineffective actions within 14 days`
      });
    }

    // 2. Neutral outcomes threshold (≥3 on same risk)
    const neutralSql = `
      SELECT ra.risk_id, r.house_id as service_id, COUNT(*) as count
      FROM risk_actions ra
      JOIN risks r ON r.id = ra.risk_id
      WHERE r.company_id = $1
      AND COALESCE(ra.director_override_outcome::text, ra.rm_override_outcome::text, ra.calculated_outcome::text) = 'Neutral'
      AND ra.completed_at >= NOW() - INTERVAL '30 days'
      GROUP BY ra.risk_id, r.house_id
      HAVING COUNT(*) >= 3
    `;
    const neutralRes = await query(neutralSql, [companyId]);
    for (const row of neutralRes.rows) {
      await this.createControlFailureFlag({
        service_id: row.service_id,
        risk_id: row.risk_id,
        failure_type: 'neutral_outcomes',
        threshold_trigger: `${row.count} neutral outcomes on same risk (Stagnation)`
      });
    }

    // 3. Recurrence after closure
    const recurrenceSql = `
      SELECT r.id as risk_id, r.house_id as service_id, r.title, r.closed_at
      FROM risks r
      WHERE r.company_id = $1
      AND r.status = 'Closed'
      AND r.closed_at >= NOW() - INTERVAL '14 days'
      AND EXISTS (
        SELECT 1 FROM governance_pulses gp
        WHERE gp.house_id = r.house_id
        AND gp.risk_domain = r.risk_domain
        AND gp.entry_date > r.closed_at::date
      )
    `;
    const recurrenceRes = await query(recurrenceSql, [companyId]);
    for (const row of recurrenceRes.rows) {
      await this.createControlFailureFlag({
        service_id: row.service_id,
        risk_id: row.risk_id,
        failure_type: 'recurrence',
        threshold_trigger: `Risk "${row.title}" closed on ${row.closed_at} reappeared within 14 days`
      });
    }
  }

  private async createControlFailureFlag(data: { service_id: string; risk_id: string; failure_type: string; threshold_trigger: string }) {
    const existing = await query(
      `SELECT id FROM control_failure_flags 
       WHERE service_id = $1 AND risk_id = $2 AND failure_type = $3 AND resolved_at IS NULL`,
      [data.service_id, data.risk_id, data.failure_type]
    );

    if (existing.rows.length === 0) {
      await query(
        `INSERT INTO control_failure_flags (service_id, risk_id, failure_type, threshold_trigger)
         VALUES ($1, $2, $3, $4)`,
        [data.service_id, data.risk_id, data.failure_type, data.threshold_trigger]
      );
      logger.warn(`Control failure detected: ${data.failure_type} at service ${data.service_id}`);
    }
  }

  async generateMonthlyBoardReportDraft(companyId: string, directorId: string, periodStart: string, periodEnd: string) {
    const reviewsRes = await query(
      `SELECT wr.governance_narrative, wr.overall_position, h.name as house_name
       FROM weekly_reviews wr
       JOIN houses h ON h.id = wr.house_id
       WHERE wr.company_id = $1 AND wr.week_ending BETWEEN $2 AND $3
       AND wr.status = 'LOCKED'`,
      [companyId, periodStart, periodEnd]
    );

    const effectiveness = await this.getActionEffectivenessSummary(companyId, { start: periodStart, end: periodEnd });

    let draft = `MONTHLY BOARD REPORT: ${periodStart} to ${periodEnd}\n\n`;
    draft += `1. GOVERNANCE SUMMARY\n`;
    
    const positions = reviewsRes.rows.reduce((acc: any, r: any) => {
      acc[r.overall_position] = (acc[r.overall_position] || 0) + 1;
      return acc;
    }, {});
    
    draft += `• Service Positions: ${positions.Stable || 0} Stable, ${positions.Watch || 0} Watch, ${positions.Concern || 0} Concern\n`;
    draft += `• Action Effectiveness: ${effectiveness.org_summary.effective} Effective, ${effectiveness.org_summary.ineffective} Ineffective\n`;
    
    draft += `\n2. SERVICE BREAKDOWN\n`;
    reviewsRes.rows.forEach(r => {
      draft += `• ${r.house_name}: ${r.overall_position}\n`;
    });

    draft += `\n3. DIRECTOR'S OBSERVATIONS\n[Enter strategic narrative here]\n\n`;
    draft += `4. FORWARD PLAN\n[Enter planned interventions here]`;

    const res = await query(
      `INSERT INTO monthly_board_reports (company_id, report_period_start, report_period_end, generated_by, draft_narrative)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [companyId, periodStart, periodEnd, directorId, draft]
    );

    return res.rows[0];
  }

  async createIntervention(directorId: string, data: { service_id: string; intervention_type: string; message: string; target_user_id?: string }) {
    const res = await query(
      `INSERT INTO director_interventions (director_user_id, service_id, intervention_type, message, target_user_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [directorId, data.service_id, data.intervention_type, data.message, data.target_user_id]
    );

    const flagsRes = await query(`SELECT director_alert_flags FROM houses WHERE id = $1`, [data.service_id]);
    const flags = flagsRes.rows[0]?.director_alert_flags || {};
    flags[data.intervention_type] = true;
    flags[`${data.intervention_type}_at`] = new Date().toISOString();

    await query(`UPDATE houses SET director_alert_flags = $1 WHERE id = $2`, [flags, data.service_id]);

    return res.rows[0];
  }

  async getUnacknowledgedSeriousIncidents(companyId: string) {
    const sql = `
      SELECT i.*, h.name as house_name,
             EXTRACT(EPOCH FROM (NOW() - i.created_at))/3600 as age_hours
      FROM incidents i
      JOIN houses h ON h.id = i.house_id
      LEFT JOIN ri_acknowledgements ra ON ra.incident_id = i.id
      WHERE i.company_id = $1
      AND i.severity IN ('serious', 'critical')
      AND ra.id IS NULL
      ORDER BY i.created_at ASC
    `;
    const res = await query(sql, [companyId]);
    return res.rows;
  }

  async getControlFailures(companyId: string) {
    const res = await query(
      `SELECT cff.*, h.name as service_name, r.title as risk_title
       FROM control_failure_flags cff
       JOIN houses h ON h.id = cff.service_id
       LEFT JOIN risks r ON r.id = cff.risk_id
       WHERE h.company_id = $1 AND cff.resolved_at IS NULL
       ORDER BY cff.detected_at DESC`,
      [companyId]
    );
    return res.rows;
  }

  async resolveControlFailure(id: string, userId: string, note: string) {
    const res = await query(
      `UPDATE control_failure_flags 
       SET resolved_at = NOW(), resolved_by = $1, resolution_note = $2
       WHERE id = $3 RETURNING *`,
      [userId, note, id]
    );
    return res.rows[0];
  }

  async finaliseMonthlyReport(id: string, userId: string, finalNarrative: string) {
    const res = await query(
      `UPDATE monthly_board_reports 
       SET final_narrative = $1, status = 'finalised', generated_at = NOW()
       WHERE id = $2 AND generated_by = $3 RETURNING *`,
      [finalNarrative, id, userId]
    );
    return res.rows[0];
  }
}

export const directorGovernanceService = new DirectorGovernanceService();
