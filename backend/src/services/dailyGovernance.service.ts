import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export class DailyGovernanceService {
  async openLog(house_id: string, user_id: string, company_id: string) {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if log already exists for today
    const existing = await query(
      'SELECT * FROM daily_governance_log WHERE house_id = $1 AND review_date = $2',
      [house_id, today]
    );

    if (existing.rows[0]) {
      return existing.rows[0];
    }

    const id = uuidv4();
    const result = await query(
      `INSERT INTO daily_governance_log (id, house_id, review_date, completed, review_type)
       VALUES ($1, $2, $3, false, 'Primary') RETURNING *`,
      [id, house_id, today]
    );

    return result.rows[0];
  }

  async completeLog(
    log_id: string,
    opts: {
      note: string;
      user_id: string;
      company_id: string;
      is_deputy_review?: boolean;
      leadership_narrative?: string;
      team_brief?: string;
      material_change?: boolean;
    }
  ) {
    const { note, user_id, company_id, is_deputy_review = false } = opts;
    // 1. Check for High/Critical signals today if deputy review
    let enhanced_oversight = false;
    let director_notified: Date | null = null;

    const logRes = await query('SELECT house_id FROM daily_governance_log WHERE id = $1', [log_id]);
    const house_id = logRes.rows[0]?.house_id;

    if (is_deputy_review && house_id) {
      const signalsRes = await query(
        `SELECT COUNT(*) FROM governance_pulses
         WHERE house_id = $1 AND entry_date = CURRENT_DATE
         AND severity IN ('High', 'Critical')`,
        [house_id]
      );
      if (parseInt(signalsRes.rows[0].count) > 0) {
        enhanced_oversight = true;
        director_notified = new Date();
      }
    }

    // Two records from one review (Chapter 2):
    //  - leadership_narrative: the full governance record (private to RM/Director/RI);
    //  - team_brief: the concise operational briefing published to Team Leaders.
    // Proportionality: material_change decides whether TLs must acknowledge, or simply
    // see "no new governance priorities today".
    const leadership = (opts.leadership_narrative || note || '').trim();
    const brief = (opts.team_brief || '').trim();
    const material = opts.material_change !== false && brief.length > 0;

    const result = await query(
      `UPDATE daily_governance_log
       SET completed = true, daily_note = $1, reviewed_by = $2, completed_at = NOW(),
           is_deputy_review = $4, review_type = $5,
           escalation_sent = $6, director_alerted_at = $7,
           company_id = COALESCE(company_id, $8),
           leadership_narrative = $9, team_brief = $10, material_change = $11,
           published_at = NOW(), published_by = $2
       WHERE id = $3 RETURNING *`,
      [note, user_id, log_id, is_deputy_review, is_deputy_review ? 'Deputy Cover' : 'Primary',
       enhanced_oversight, director_notified, company_id, leadership || null, brief || null, material]
    );

    if (!result.rows[0]) throw new Error('Governance log not found');

    // Notify the service's Team Leaders that a brief has been published (best-effort).
    if (material && house_id) {
      try {
        const { notificationsService } = await import('./notifications.service');
        const tls = await query(
          `SELECT u.id FROM users u JOIN user_houses uh ON uh.user_id = u.id
            WHERE uh.house_id = $1 AND u.role = 'TEAM_LEADER' AND u.status = 'active'`,
          [house_id]
        );
        for (const t of tls.rows) {
          await notificationsService.create({
            company_id, user_id: t.id, type: 'daily_brief',
            title: 'Daily Governance Brief published',
            body: "Today's governance priorities are ready — please review and acknowledge.",
            link: '/dashboard',
          });
        }
      } catch { /* notification is best-effort */ }
    }

    return result.rows[0];
  }

  // The latest published Team Brief for a set of services (the TL's assigned houses),
  // for today, with whether THIS user has acknowledged it.
  async latestTeamBrief(company_id: string, house_ids: string[], user_id: string) {
    if (!house_ids.length) return null;
    const res = await query(
      `SELECT dgl.id, dgl.house_id, h.name AS house_name, dgl.team_brief, dgl.material_change,
              dgl.published_at, dgl.review_date,
              (a.id IS NOT NULL) AS acknowledged
         FROM daily_governance_log dgl
         JOIN houses h ON h.id = dgl.house_id
         LEFT JOIN daily_brief_acknowledgements a ON a.log_id = dgl.id AND a.user_id = $3
        WHERE dgl.house_id = ANY($1::uuid[])
          AND dgl.completed = true
          AND dgl.review_date = CURRENT_DATE
        ORDER BY dgl.published_at DESC NULLS LAST
        LIMIT 1`,
      [house_ids, company_id, user_id]
    );
    return res.rows[0] || null;
  }

  async acknowledgeBrief(log_id: string, user_id: string, company_id: string) {
    await query(
      `INSERT INTO daily_brief_acknowledgements (log_id, company_id, user_id)
       VALUES ($1, $2, $3) ON CONFLICT (log_id, user_id) DO NOTHING`,
      [log_id, company_id, user_id]
    );
    return { acknowledged: true };
  }

  async getCoverage(company_id: string) {
    const result = await query(
      `SELECT h.id as house_id, h.name as house_name, 
              MAX(dgl.review_date) as last_review_date,
              CASE 
                WHEN MAX(dgl.review_date) = CURRENT_DATE THEN 'Up to Date'
                WHEN MAX(dgl.review_date) = CURRENT_DATE - INTERVAL '1 day' THEN 'Due'
                ELSE 'Overdue'
              END as status
       FROM houses h
       LEFT JOIN daily_governance_log dgl ON dgl.house_id = h.id AND dgl.completed = true
       WHERE h.company_id = $1
       GROUP BY h.id, h.name
       ORDER BY last_review_date DESC NULLS LAST`,
      [company_id]
    );
    return result.rows;
  }
}

export const dailyGovernanceService = new DailyGovernanceService();
