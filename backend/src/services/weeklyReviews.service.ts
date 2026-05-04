import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

// export class WeeklyReviewsService {
export class WeeklyReviewsService {
  async validateStepDependency(targetStep: number, existingContent: any) {
    const mandatoryFields: Record<number, string[]> = {
      8: ['step8_interpretation'],
      11: [], // Logic handled below (conditional)
      12: ['step12_decisions'],
      14: ['step14_overall_position'],
      15: ['step15_narrative']
    };

    // Special validation for Step 11
    if (targetStep > 11) {
      const riskAnalysis = existingContent.step10_risk_analysis || [];
      const hasIneffective = riskAnalysis.some((r: any) => r.controls_effective === 'Partially' || r.controls_effective === 'No');
      if (hasIneffective && !existingContent.step11_control_failures) {
        throw new Error('Governance Block: Mandatory field "Control Failures" must be completed because ineffective controls were identified in Step 10.');
      }
    }

    const required = mandatoryFields[targetStep] || [];
    for (const field of required) {
      if (!existingContent || !existingContent[field]) {
        throw new Error(`Governance Block: Mandatory field '${field}' must be completed before proceeding.`);
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

    const mergedContent = { ...(existing.rows[0]?.content || {}), ...(data.content || {}) };
    const currentStep = existing.rows[0]?.step_reached || 1;
    const targetStep = data.step_reached || currentStep;

    // 2. Validate Sequence
    if (targetStep > currentStep) {
      for (let s = currentStep + 1; s <= targetStep; s++) {
        await this.validateStepDependency(s, mergedContent);
      }
    }

    // 3. Narrative Generation (Step 15)
    if (targetStep === 15 && !mergedContent.step15_narrative) {
      mergedContent.step15_narrative = this.generateNarrative(mergedContent);
    }

    const id = existing.rows[0]?.id || uuidv4();
    const result = await query(
      `INSERT INTO weekly_reviews (id, company_id, house_id, week_ending, content, step_reached, status, created_by, governance_narrative, overall_position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (house_id, week_ending) DO UPDATE
       SET content = $5, step_reached = $6, status = COALESCE($7, weekly_reviews.status), 
           governance_narrative = $9, overall_position = $10, updated_at = NOW()
       RETURNING *`,
      [
        id, 
        company_id, 
        data.house_id, 
        data.week_ending, 
        JSON.stringify(mergedContent), 
        targetStep, 
        data.status || 'draft', 
        user_id,
        mergedContent.step15_narrative || null,
        mergedContent.step14_overall_position || null
      ]
    );
    return result.rows[0];
  }

  private generateNarrative(content: any): string {
    const parts = [];
    parts.push(`GOVERNANCE OVERSIGHT SUMMARY: WEEK ENDING ${content.step2_period?.split(' to ')?.[1] || 'N/A'}`);
    
    // 1. Activity & Signals
    parts.push(`1. ACTIVITY ANALYSIS:\nA total of ${content.step3_pulse_count || 0} governance pulses were completed this period. Signal analysis identified ${content.step4_signals?.length || 0} frontline observations.`);
    
    // 2. Patterns & Worsening Trends
    if (content.step5_repeats || content.step6_worsening) {
      parts.push(`2. PATTERNS & TRENDS:\nRepeated Issues: ${content.step5_repeats || 'None identified'}.\nWorsening Trends: ${content.step6_worsening || 'None identified'}.`);
    }

    // 3. Risk & Control Analysis
    const risks = content.step10_risk_analysis || [];
    if (risks.length > 0) {
      const ineffective = risks.filter((r: any) => r.controls_effective !== 'Yes');
      parts.push(`3. RISK CONTROL ANALYSIS:\nReview of ${risks.length} active risks performed. ${ineffective.length} control sets were identified as requiring refinement.`);
      if (content.step11_control_failures) {
        parts.push(`CONTROL FAILURE ANALYSIS: ${content.step11_control_failures}`);
      }
    }

    // 4. Incident Forensics
    if (content.step9_incident_summary) {
        parts.push(`4. INCIDENT FORENSICS:\n${content.step9_incident_summary}`);
    }

    // 5. Manager Interpretation & Decisions
    parts.push(`5. MANAGEMENT INTERPRETATION:\n${content.step8_interpretation || 'No interpretation provided'}.`);
    parts.push(`DECISIONS & ACTIONS: ${content.step12_decisions || 'No new decisions recorded'}.`);

    // 6. Final Position
    parts.push(`OVERALL SERVICE POSITION: ${content.step14_overall_position?.toUpperCase() || 'STABLE'}`);

    return parts.join('\n\n');
  }

  async prepareReview(company_id: string, house_id: string, week_ending: string) {
    const end = new Date(week_ending);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    const houseRes = await query('SELECT name FROM houses WHERE id = $1 AND company_id = $2', [house_id, company_id]);
    const house = houseRes.rows[0];
    if (!house) throw new Error('House not found or access denied');

    // Step 3 & 4: Pulse Data
    const signalsRes = await query(
      `SELECT id, entry_date, entry_time, signal_type, severity, risk_domain, pattern_concern, description 
       FROM governance_pulses 
       WHERE house_id = $1 AND company_id = $2 
       AND entry_date BETWEEN $3 AND $4
       ORDER BY entry_date DESC, entry_time DESC`,
      [house_id, company_id, startStr, endStr]
    );
    const signals = signalsRes.rows;

    // Step 5: Repeating Issues (Clusters)
    const clustersRes = await query(
      `SELECT risk_domain, COUNT(*) as count, ARRAY_AGG(DISTINCT pattern_concern) as concerns
       FROM governance_pulses
       WHERE house_id = $1 AND company_id = $2 AND entry_date BETWEEN $3 AND $4
       GROUP BY risk_domain
       HAVING COUNT(*) >= 2`,
      [house_id, company_id, startStr, endStr]
    );
    const repeats = clustersRes.rows.map(r => `${r.risk_domain} (${r.count} signals, ${r.concerns.join('/')})`).join('; ');

    // Step 6: Worsening (Escalating or Severity Increase)
    const worsening = signals.filter(s => s.pattern_concern === 'Escalating' || s.severity === 'Critical' || s.severity === 'High')
                             .map(s => `[${s.entry_date}] ${s.risk_domain}: ${s.severity}`).join('; ');

    // Step 7: Improvements (Stable/Improving - Mocked logic or based on trajectory in clusters)
    // For now, list domains with only Low/Moderate signals if they were higher before
    const improvements = "Analysis of trajectory trends shows stabilisation in recorded domains.";

    // Step 9 & 10: Risks
    const risksRes = await query(
      `SELECT r.id, r.title, r.trajectory, r.status, 
              (SELECT outcome FROM action_effectiveness ae WHERE ae.risk_id = r.id ORDER BY calculated_at DESC LIMIT 1) as last_effectiveness
       FROM risks r
       WHERE r.house_id = $1 AND r.company_id = $2 AND r.status != 'Closed'`,
      [house_id, company_id]
    );

    // [GOVERNANCE] Senior roles need a list of available houses to switch context
    const housesRes = await query('SELECT id, name FROM houses WHERE company_id = $1 AND is_active = true', [company_id]);

    return {
      house_id,
      house_name: house.name,
      available_houses: housesRes.rows,
      week_range: { start: startStr, end: endStr },
      auto_population: {
        pulse_count: signals.length,
        signals: signals,
        repeats: repeats,
        worsening: worsening,
        improvements: improvements,
        active_risks: risksRes.rows.map(r => ({
          id: r.id,
          title: r.title,
          current_trajectory: r.trajectory,
          last_effectiveness: r.last_effectiveness || 'Unknown'
        }))
      }
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

  async complete(id: string, company_id: string, user_id: string) {
    const existing = await this.findById(id, company_id);
    if (!existing) throw new Error('Review not found');

    const result = await query(
      `UPDATE weekly_reviews 
       SET status = 'LOCKED', updated_at = NOW() 
       WHERE id = $1 AND company_id = $2 
       RETURNING *`,
      [id, company_id]
    );
    return result.rows[0];
  }

  async finalise(id: string, company_id: string, user_id: string) {
    const existing = await this.findById(id, company_id);
    if (!existing) throw new Error('Review not found');

    // 1. Update status to awaiting validation
    const result = await query(
      `UPDATE weekly_reviews 
       SET status = 'pending_validation', 
           validation_status = 'Pending',
           rm_finalised_at = NOW(), 
           updated_at = NOW() 
       WHERE id = $1 AND company_id = $2 
       RETURNING *`,
      [id, company_id]
    );

    // 2. Notify RI and Directors
    const houseRes = await query('SELECT name FROM houses WHERE id = $1', [existing.house_id]);
    const houseName = houseRes.rows[0]?.name || 'Service';

    const seniorUsers = await query(
      "SELECT id FROM users WHERE company_id = $1 AND role IN ('DIRECTOR', 'ADMIN', 'SUPER_ADMIN')",
      [company_id]
    );

    const { notificationsService } = require('./notifications.service');
    for (const user of seniorUsers.rows) {
      await notificationsService.create({
        company_id,
        user_id: user.id,
        type: 'weekly_review_ready',
        title: 'Weekly Review Ready',
        body: `Weekly review for ${houseName} (W/E ${existing.week_ending}) is ready for validation.`,
        link: `/weekly-reviews/${id}`,
        metadata: { review_id: id, house_id: existing.house_id }
      });
    }

    return result.rows[0];
  }

  async validate(id: string, company_id: string, user_id: string, data: { validation_status: string; validation_comment: string }) {
    const existing = await this.findById(id, company_id);
    if (!existing) throw new Error('Review not found');

    const { validation_status, validation_comment } = data;
    const allowed = ['Approved', 'Challenged', 'Reopened'];
    if (!allowed.includes(validation_status)) throw new Error('Invalid validation status');

    let status = existing.status;
    if (validation_status === 'Approved') {
      status = 'LOCKED';
    } else if (validation_status === 'Challenged') {
      status = 'draft'; // Allow RM to edit again
    } else if (validation_status === 'Reopened') {
      status = 'draft';
    }

    const result = await query(
      `UPDATE weekly_reviews 
       SET status = $1, 
           validation_status = $2, 
           validation_comment = $3, 
           validation_by = $4, 
           validation_at = NOW(), 
           updated_at = NOW() 
       WHERE id = $5 AND company_id = $6 
       RETURNING *`,
      [status, validation_status, validation_comment, user_id, id, company_id]
    );

    // Notify RM
    const { notificationsService } = require('./notifications.service');
    await notificationsService.create({
      company_id,
      user_id: existing.created_by,
      type: 'weekly_review_validated',
      title: `Weekly Review ${validation_status}`,
      body: `Your weekly review was ${validation_status.toLowerCase()}: ${validation_comment}`,
      link: `/weekly-reviews/${id}`,
      metadata: { review_id: id, status: validation_status }
    });

    return result.rows[0];
  }
}

export const weeklyReviewsService = new WeeklyReviewsService();
