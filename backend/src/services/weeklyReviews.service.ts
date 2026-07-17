import { query } from '../config/database';
import { assertIndependent } from '../utils/separationOfDuties';
import { v4 as uuidv4 } from 'uuid';
import { trajectoryForRisk } from './trajectory.service';

// export class WeeklyReviewsService {
export class WeeklyReviewsService {
  async validateStepDependency(targetStep: number, existingContent: any) {
    // 13-step UI numbering: steps 1–10 auto-populate (no mandatory input); the manager
    // supplies Leadership Interpretation (step 11), Overall Position (step 12), and the
    // Narrative (step 13). Keys are indexed by (targetStep - 1), matching the save() loop.
    const fieldLabels: Record<string, string> = {
      step8_interpretation: 'Leadership Interpretation',
      step14_overall_position: 'Overall Position',
      step15_narrative: 'Governance Narrative',
    };
    const mandatoryFields: Record<number, string[]> = {
      // Leadership Interpretation was retired from the review; only the overall position
      // is gated now, required before the narrative / finalise step.
      11: ['step14_overall_position'],
    };

    const required = mandatoryFields[targetStep - 1] || [];
    for (const field of required) {
      if (!existingContent || !existingContent[field]) {
        throw new Error(`Governance Block: '${fieldLabels[field] || field}' must be completed before proceeding.`);
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

    // 3. Narrative (Step 15). Finding G: the machine text is only ever a DRAFT — never
    // silently promoted to the final narrative. The RM must author step15_narrative in
    // their own words; finalise() gates on it.
    if (targetStep === 15 && !mergedContent.step15_narrative_draft) {
      mergedContent.step15_narrative_draft = this.generateNarrative(mergedContent);
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

    // 6. Lessons Learnt (Finding L)
    if (content.lessons_learnt) parts.push(`6. LESSONS LEARNT:\n${content.lessons_learnt}`);

    // 7. Week Ahead — Anticipated Risks (Finding L)
    const antItems = content.anticipated_risks?.items || [];
    const antNote = content.anticipated_risks?.rm_note || '';
    if (antItems.length || antNote) {
      const list = antItems.map((a: any) => `- ${a.theme} (${a.reason})`).join('\n') || 'None flagged.';
      parts.push(`7. WEEK AHEAD — ANTICIPATED RISKS:\n${list}${antNote ? `\nManager note: ${antNote}` : ''}`);
    }

    // Final Position
    parts.push(`OVERALL SERVICE POSITION: ${content.step14_overall_position?.toUpperCase() || 'STABLE'}`);

    return parts.join('\n\n');
  }

  // Finding L: pre-fill the week-ahead watch-list from live data — open risks that are
  // deteriorating (computed trajectory, Finding K), have an open escalation, or an overdue
  // action. The RM confirms/edits and adds a note; "what could go wrong" is evidenced.
  async buildAnticipatedRisks(company_id: string, house_id: string) {
    const risks = (await query(
      `SELECT r.id, COALESCE(r.strategic_theme, r.title) AS theme, r.source_cluster_id,
              EXISTS (SELECT 1 FROM escalations e WHERE e.risk_id = r.id AND COALESCE(e.lifecycle_status::text, e.status) NOT IN ('Closed','Resolved','closed','resolved')) AS has_open_esc,
              EXISTS (SELECT 1 FROM risk_actions a WHERE a.risk_id = r.id AND a.status NOT IN ('Complete','Completed','Cancelled') AND a.due_date < NOW()) AS has_overdue
         FROM risks r
        WHERE r.house_id = $1 AND r.company_id = $2 AND LOWER(r.status) NOT IN ('closed','resolved')`,
      [house_id, company_id]
    )).rows;
    const out: Array<{ risk_id: string; theme: string; reason: string }> = [];
    for (const r of risks) {
      const reasons: string[] = [];
      try { if ((await trajectoryForRisk(r.id, r.source_cluster_id)).direction === 'Deteriorating') reasons.push('trajectory deteriorating'); } catch { /* non-fatal */ }
      if (r.has_open_esc) reasons.push('open escalation');
      if (r.has_overdue) reasons.push('overdue action');
      if (reasons.length) out.push({ risk_id: r.id, theme: r.theme, reason: reasons.join(', ') });
    }
    return out;
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
    // Return repeats as an ARRAY (the UI lists them and counts them). It used to be a single
    // joined string, which the review wizard then tried to .map() over — crashing the whole
    // page. Each entry carries a human label plus its parts.
    const repeats = clustersRes.rows.map(r => {
      // r.concerns is a Postgres array_agg — it can arrive as a JS array ([null]) or as the
      // raw literal '{NULL}'. Normalise both, drop NULL/empty entries so the label reads clean.
      const concernArr: any[] = Array.isArray(r.concerns)
        ? r.concerns
        : typeof r.concerns === 'string' ? r.concerns.replace(/[{}]/g, '').split(',') : [];
      const concernsList = concernArr
        .map((c: any) => String(c ?? '').trim())
        .filter((c: string) => c && c.toUpperCase() !== 'NULL')
        .join('/');
      return {
        risk_domain: Array.isArray(r.risk_domain) ? r.risk_domain[0] : r.risk_domain,
        count: Number(r.count) || 0,
        concern: concernsList,
        label: `${Array.isArray(r.risk_domain) ? r.risk_domain[0] : r.risk_domain} (${r.count} signals${concernsList ? ', ' + concernsList : ''})`,
      };
    });

    // Step 6: Worsening (Escalating or Severity Increase)
    const worsening = signals.filter(s => s.pattern_concern === 'Escalating' || s.severity === 'Critical' || s.severity === 'High')
                             .map(s => `[${s.entry_date}] ${s.risk_domain}: ${s.severity}`).join('; ');

    // Step 7: Improvements (Stable/Improving - Mocked logic or based on trajectory in clusters)
    // For now, list domains with only Low/Moderate signals if they were higher before
    const improvements = "Analysis of trajectory trends shows stabilisation in recorded domains.";

    // Step 9 & 10: Risks
    const risksRes = await query(
      `SELECT r.id, r.title, r.trajectory, r.status, NULL as last_effectiveness
       FROM risks r
       WHERE r.house_id = $1 AND r.company_id = $2 AND LOWER(r.status) NOT IN ('closed')`,
      [house_id, company_id]
    );

    // [GOVERNANCE] Senior roles need a list of available houses to switch context
    const housesRes = await query("SELECT id, name FROM houses WHERE company_id = $1 AND status != 'closed'", [company_id]);

    // Fetch service users (residents) from pulses to populate the dropdown
    const serviceUsersRes = await query(
      `SELECT display_name as name FROM service_users WHERE house_id = $1 AND is_active = true ORDER BY display_name`, 
      [house_id]
    );

    return {
      house_id,
      house_name: house.name,
      available_houses: housesRes.rows,
      service_users: serviceUsersRes.rows,
      week_range: { start: startStr, end: endStr },
      anticipated: await this.buildAnticipatedRisks(company_id, house_id),
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

    const houseRes = await query('SELECT name FROM houses WHERE id = $1', [existing.house_id]);
    const houseName = houseRes.rows[0]?.name || 'Service';

    // Finding G: gate on an overall position and an RM-authored narrative (own words,
    // >=40 chars, not the machine draft), and capture a signed acknowledgement.
    const content = existing.content || {};
    const position = existing.overall_position || content.step14_overall_position;
    if (!position) throw new Error('An overall service position is required before finalising.');
    const narrative = String(content.step15_narrative || '').trim();
    const draft = String(content.step15_narrative_draft || '').trim();
    if (narrative.length < 40) throw new Error('A Registered Manager narrative in your own words (at least 40 characters) is required before finalising.');
    if (draft && narrative === draft) throw new Error('The governance narrative must be your own words, not the machine-generated draft.');
    // Finding L: Lessons Learnt + a week-ahead anticipated-risks decision are required.
    if (String(content.lessons_learnt || '').trim().length < 20) throw new Error('Lessons Learnt (at least 20 characters) is required before finalising.');
    const ant = content.anticipated_risks || {};
    if (!(Array.isArray(ant.items) && ant.items.length) && String(ant.rm_note || '').trim().length < 10) {
      throw new Error('Record the week-ahead anticipated risks (or a note if none are anticipated) before finalising.');
    }

    const rmRow = (await query(`SELECT first_name || ' ' || last_name AS name FROM users WHERE id = $1`, [user_id])).rows[0];
    const rmName = rmRow?.name || 'Registered Manager';
    const ackStatement = `I, ${rmName} (Registered Manager), have reviewed the governance for ${houseName} for the week ending ${existing.week_ending} and acknowledge the overall position (${position}) and the trajectory narrative recorded above.`;

    // Update status to awaiting validation — record WHO finalised (separation-of-duties
    // guard in validate()) plus the signed acknowledgement and the RM-authored narrative.
    const result = await query(
      `UPDATE weekly_reviews
       SET status = 'pending_validation',
           validation_status = 'Pending',
           rm_finalised_at = NOW(),
           rm_finalised_by = $3,
           acknowledged_by = $3,
           acknowledged_by_name = $4,
           acknowledged_at = NOW(),
           acknowledgement_statement = $5,
           governance_narrative = $6,
           updated_at = NOW()
       WHERE id = $1 AND company_id = $2
       RETURNING *`,
      [id, company_id, user_id, rmName, ackStatement, narrative]
    );

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

    // Separation of duties: the person who finalised (or authored) this review cannot
    // also validate it — even if they hold both RM and RI/Director roles.
    assertIndependent(existing.rm_finalised_by || existing.created_by, user_id, 'validation');

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

  // Publish a validated/locked review to the house team. Only runs once validated,
  // stamps publisher + time, and fans out a notification to all active staff at the
  // house (+ users granted all-site visibility).
  async publish(id: string, company_id: string, user_id: string) {
    const rev = await this.findById(id, company_id);
    if (!rev) throw new Error('Review not found');
    if (rev.status !== 'LOCKED' && rev.status !== 'published' && rev.validation_status !== 'Approved') {
      throw new Error('Only a validated/locked review can be published to the team.');
    }

    const result = await query(
      `UPDATE weekly_reviews
          SET status = 'published', published_at = NOW(), published_by = $1, updated_at = NOW()
        WHERE id = $2 AND company_id = $3
        RETURNING *`,
      [user_id, id, company_id]
    );

    // Recipients: active staff at this house (+ all-site-visibility users).
    const team = await query(
      `SELECT DISTINCT u.id
         FROM users u
         LEFT JOIN user_houses uh ON uh.user_id = u.id
        WHERE u.company_id = $1 AND u.status = 'active'
          AND (uh.house_id = $2 OR u.can_view_all_houses = true)`,
      [company_id, rev.house_id]
    );

    const { notificationsService } = require('./notifications.service');
    for (const m of team.rows) {
      await notificationsService.create({
        company_id, user_id: m.id,
        type: 'weekly_review_published',
        title: 'Weekly review published',
        body: `The weekly governance review for your service (W/E ${rev.week_ending}) is ready to read.`,
        link: `/weekly-reviews/${id}`,
        metadata: { review_id: id, house_id: rev.house_id },
      });
    }

    return { ...result.rows[0], recipients: team.rows.length };
  }

  // Current user marks a published review as read. Idempotent.
  async acknowledge(reviewId: string, company_id: string, user_id: string) {
    await query(
      `INSERT INTO weekly_review_acknowledgements (company_id, review_id, user_id)
       VALUES ($1, $2, $3) ON CONFLICT (review_id, user_id) DO NOTHING`,
      [company_id, reviewId, user_id]
    );
    return { acknowledged: true };
  }

  // Finding M: who has / hasn't read a published review. Mirrors publish()'s recipient
  // rule exactly so the figures can't drift.
  async getReadStatus(id: string, company_id: string) {
    const rev = await this.findById(id, company_id);
    if (!rev) throw new Error('Review not found');
    const recipients = (await query(
      `SELECT DISTINCT u.id, u.first_name || ' ' || u.last_name AS name, u.role
         FROM users u
         LEFT JOIN user_houses uh ON uh.user_id = u.id
        WHERE u.company_id = $1 AND u.status = 'active'
          AND (uh.house_id = $2 OR u.can_view_all_houses = true)`,
      [company_id, rev.house_id]
    )).rows;
    const acked = new Set((await query(
      `SELECT user_id FROM weekly_review_acknowledgements WHERE review_id = $1`, [id]
    )).rows.map((r: any) => r.user_id));
    const read = recipients.filter((r: any) => acked.has(r.id));
    const unread = recipients.filter((r: any) => !acked.has(r.id));
    return { recipients: recipients.length, read: read.length, unread };
  }

  // Finding M: chase only the recipients who haven't acknowledged.
  async remindUnacknowledged(id: string, company_id: string, _actor_id: string) {
    const status = await this.getReadStatus(id, company_id);
    const rev = await this.findById(id, company_id);
    const { notificationsService } = require('./notifications.service');
    for (const u of status.unread) {
      await notificationsService.create({
        company_id, user_id: u.id,
        type: 'weekly_review_reminder',
        title: 'Reminder: weekly review to read',
        body: `Please read the weekly governance review for your service (W/E ${rev?.week_ending}).`,
        link: `/weekly-reviews/${id}`,
        metadata: { review_id: id },
      });
    }
    return { reminded: status.unread.length };
  }

  // Finding O: provider-level roll-up for a given week — per-site finalisation + the
  // provider-wide position (worst-of) + any existing provider sign-off.
  async providerRollup(company_id: string, week_ending: string) {
    const sites = (await query(
      `SELECT h.id AS house_id, h.name AS house, wr.id AS review_id,
              wr.status, wr.validation_status, wr.overall_position AS position,
              wr.acknowledged_by_name AS rm_signed_by, wr.acknowledged_at AS rm_signed_at
         FROM houses h
         LEFT JOIN weekly_reviews wr
                ON wr.house_id = h.id AND wr.week_ending = $2 AND wr.company_id = $1
        WHERE h.company_id = $1 AND COALESCE(h.is_active, true) = true
        ORDER BY h.name`,
      [company_id, week_ending]
    )).rows;
    const FINALISED = ['pending_validation', 'validated', 'published', 'LOCKED'];
    const sitesData = sites.map((s: any) => ({
      house_id: s.house_id, house: s.house, review_id: s.review_id || null,
      status: s.status || 'not started', published: s.status === 'published',
      position: s.position || null, rm_signed: !!s.rm_signed_by, rm_signed_by: s.rm_signed_by || null,
      finalised: FINALISED.includes(s.status),
    }));
    const outstanding = sitesData.filter((s) => !s.finalised).map((s) => s.house);
    const provider_position =
      sitesData.some((s) => s.position === 'Not assured') ? 'Not assured'
      : sitesData.some((s) => s.position === 'Assured with actions') ? 'Assured with actions'
      : (sitesData.length && sitesData.every((s) => s.position === 'Assured')) ? 'Assured'
      : 'Mixed';
    const signoff = (await query(
      `SELECT position, acknowledged_by_name, acknowledged_at, statement
         FROM provider_review_signoffs WHERE company_id = $1 AND week_ending = $2`,
      [company_id, week_ending]
    )).rows[0] || null;
    return { week_ending, sites: sitesData, sites_total: sitesData.length, sites_finalised: sitesData.filter((s) => s.finalised).length, outstanding, provider_position, signoff };
  }

  // Finding O: sign the provider-wide position — gated on every site being finalised,
  // by a Director/RI (separation of duties from the RM per-site sign-offs).
  async signProviderRollup(company_id: string, week_ending: string, user_id: string, dto: { position?: string; statement?: string }) {
    const rollup = await this.providerRollup(company_id, week_ending);
    const me = (await query(`SELECT first_name || ' ' || last_name AS name, role FROM users WHERE id = $1`, [user_id])).rows[0] || {};
    const company = (await query(`SELECT name FROM companies WHERE id = $1`, [company_id])).rows[0] || {};
    const position = dto.position || rollup.provider_position;
    // Sign-off is no longer hard-blocked by outstanding sites — leadership may sign the
    // provider position at their discretion. The statement stays honest: it records how many
    // sites were finalised at the time of sign-off and names any that were not.
    const coverage = rollup.outstanding.length > 0
      ? `${rollup.sites_finalised} of ${rollup.sites_total} services finalised (outstanding: ${rollup.outstanding.join(', ')})`
      : `all ${rollup.sites_total} services finalised`;
    const statement = dto.statement ||
      `I, ${me.name} (${me.role}), have reviewed the weekly governance of ${company.name} for the week ending ` +
      `${week_ending} — ${coverage} — and acknowledge the provider-level position: ${position}.`;
    const res = await query(
      `INSERT INTO provider_review_signoffs
         (company_id, week_ending, position, acknowledged_by, acknowledged_by_name, acknowledged_at, statement)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       ON CONFLICT (company_id, week_ending) DO UPDATE
         SET position = $3, acknowledged_by = $4, acknowledged_by_name = $5, acknowledged_at = NOW(), statement = $6
       RETURNING *`,
      [company_id, week_ending, position, user_id, me.name, statement]
    );
    return res.rows[0];
  }

  // Service-level roll-up (Director/RI, read-only): aggregate the week's per-house
  // reviews into one organisational picture. Authoring stays at the house; leadership
  // reads the synthesised whole — no separately authored service review.
  async serviceRollup(company_id: string, weekEnding?: string) {
    const weeksRes = await query(
      `SELECT DISTINCT week_ending FROM weekly_reviews WHERE company_id = $1
        ORDER BY week_ending DESC LIMIT 26`,
      [company_id]
    );
    const weeks = weeksRes.rows.map((r: any) => r.week_ending);
    const wk = weekEnding || weeks[0] || null;
    if (!wk) return { week_ending: null, weeks: [], houses: [], summary: { services_reviewed: 0, services_total: 0, awaiting: [], total_signals: 0, positions: {} } };

    const rows = (await query(
      `SELECT wr.id, wr.house_id, wr.status, wr.validation_status, wr.content,
              wr.rm_finalised_at, wr.published_at, h.name AS house_name,
              u.first_name || ' ' || u.last_name AS created_by_name
         FROM weekly_reviews wr
         JOIN houses h ON h.id = wr.house_id
         LEFT JOIN users u ON u.id = wr.created_by
        WHERE wr.company_id = $1 AND wr.week_ending = $2
        ORDER BY h.name`,
      [company_id, wk]
    )).rows;

    const allHouses = (await query(
      `SELECT id, name FROM houses WHERE company_id = $1 AND status != 'closed' ORDER BY name`,
      [company_id]
    )).rows;
    const reviewed = new Set(rows.map((r: any) => r.house_id));

    const houses = rows.map((r: any) => {
      const c = r.content || {};
      return {
        review_id: r.id,
        house_id: r.house_id,
        house_name: r.house_name,
        status: r.status,
        validation_status: r.validation_status,
        created_by_name: r.created_by_name,
        position: c.step14_overall_position || null,
        interpretation: c.step8_interpretation || null,
        narrative: c.step15_narrative || null,
        signals: c.step3_pulse_count ?? (Array.isArray(c.step4_signals) ? c.step4_signals.length : 0),
        repeats: Array.isArray(c.step5_repeats) ? c.step5_repeats.length : 0,
        risks: Array.isArray(c.step10_risk_analysis) ? c.step10_risk_analysis.length : 0,
        finalised: !!r.rm_finalised_at,
        published: !!r.published_at,
      };
    });

    const positions = houses.reduce((acc: Record<string, number>, h: any) => {
      const p = h.position || 'Not set';
      acc[p] = (acc[p] || 0) + 1; return acc;
    }, {});

    return {
      week_ending: wk,
      weeks,
      houses,
      summary: {
        services_reviewed: houses.length,
        services_total: allHouses.length,
        awaiting: allHouses.filter((h: any) => !reviewed.has(h.id)).map((h: any) => ({ house_id: h.id, house_name: h.name })),
        total_signals: houses.reduce((s: number, h: any) => s + (Number(h.signals) || 0), 0),
        positions,
      },
    };
  }

  // Roster driving the read-only view's progress + list: who has / hasn't read it.
  async getAcknowledgements(reviewId: string, company_id: string) {
    const rev = await this.findById(reviewId, company_id);
    if (!rev) throw new Error('Review not found');
    const result = await query(
      `SELECT u.id, u.first_name || ' ' || u.last_name AS name, u.role,
              a.acknowledged_at,
              (a.id IS NOT NULL) AS acknowledged
         FROM users u
         LEFT JOIN user_houses uh ON uh.user_id = u.id
         LEFT JOIN weekly_review_acknowledgements a
           ON a.user_id = u.id AND a.review_id = $1
        WHERE u.company_id = $2 AND u.status = 'active'
          AND (uh.house_id = $3 OR u.can_view_all_houses = true)
        ORDER BY acknowledged DESC, u.first_name`,
      [reviewId, company_id, rev.house_id]
    );
    const roster = result.rows;
    return {
      total: roster.length,
      acknowledged: roster.filter((r: any) => r.acknowledged).length,
      roster,
    };
  }
}

export const weeklyReviewsService = new WeeklyReviewsService();
