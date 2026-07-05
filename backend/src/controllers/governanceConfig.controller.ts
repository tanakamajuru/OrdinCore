import { Request, Response } from 'express';
import { query } from '../config/database';
import { refreshEscalationSLAs } from '../services/escalations.service';

// Admin Governance Configuration: the sector signal library, pattern thresholds,
// escalation SLAs and risk domains the engine reads — plus a read-only audit log.
// These config tables are GLOBAL per sector (shared across tenants), so viewing is
// open to ADMIN+, but mutations are SUPER_ADMIN-only (guarded again at the route).
const ok = (res: Response, data: unknown) => res.json({ success: true, data });
const fail = (res: Response, e: unknown, code = 500) =>
  res.status(code).json({ success: false, message: e instanceof Error ? e.message : 'Config error' });

export const governanceConfigController = {
  // ---- Risk Domains (governance_domains) ----
  async listDomains(req: Request, res: Response) {
    try {
      const sector = req.query.sector as string | undefined;
      const r = await query(
        `SELECT id, sector, name, description, sort_order, is_active, kloe_code, kloe_label FROM governance_domains
         ${sector ? 'WHERE sector = $1' : ''} ORDER BY sector, sort_order, name`,
        sector ? [sector] : []
      );
      return ok(res, r.rows);
    } catch (e) { return fail(res, e); }
  },
  async createDomain(req: Request, res: Response) {
    try {
      const { sector, name, description, sort_order, kloe_code, kloe_label } = req.body;
      if (!sector || !name) return fail(res, new Error('sector and name are required'), 400);
      // Capture the CQC framework mapping on create (mirrors updateDomain) so a new
      // domain isn't born with a NULL KLOE — which would reopen the gap migration 085 closed.
      const r = await query(
        `INSERT INTO governance_domains (sector, name, description, sort_order, is_active, kloe_code, kloe_label)
         VALUES ($1, $2, $3, COALESCE($4, 99), true, $5, $6) RETURNING *`,
        [sector, name, description || null, sort_order ?? null, kloe_code ?? null, kloe_label ?? null]
      );
      return ok(res, r.rows[0]);
    } catch (e) { return fail(res, e, 400); }
  },
  async updateDomain(req: Request, res: Response) {
    try {
      const { name, description, sort_order, is_active, kloe_code, kloe_label } = req.body;
      const r = await query(
        `UPDATE governance_domains SET
           name = COALESCE($2, name), description = COALESCE($3, description),
           sort_order = COALESCE($4, sort_order), is_active = COALESCE($5, is_active),
           kloe_code = COALESCE($6, kloe_code), kloe_label = COALESCE($7, kloe_label)
         WHERE id = $1 RETURNING *`,
        [req.params.id, name ?? null, description ?? null, sort_order ?? null,
         typeof is_active === 'boolean' ? is_active : null, kloe_code ?? null, kloe_label ?? null]
      );
      if (!r.rows[0]) return fail(res, new Error('Domain not found'), 404);
      return ok(res, r.rows[0]);
    } catch (e) { return fail(res, e, 400); }
  },

  // ---- Signal Library (signal_library) ----
  async listSignals(req: Request, res: Response) {
    try {
      const sector = req.query.sector as string | undefined;
      const domain = req.query.domain as string | undefined;
      const conds: string[] = []; const params: unknown[] = [];
      if (sector) { params.push(sector); conds.push(`sector = $${params.length}`); }
      if (domain) { params.push(domain); conds.push(`domain_name = $${params.length}`); }
      const r = await query(
        `SELECT id, sector, domain_name, signal_label, sort_order, is_active FROM signal_library
         ${conds.length ? 'WHERE ' + conds.join(' AND ') : ''} ORDER BY sector, domain_name, sort_order, signal_label`,
        params
      );
      return ok(res, r.rows);
    } catch (e) { return fail(res, e); }
  },
  async createSignal(req: Request, res: Response) {
    try {
      const { sector, domain_name, signal_label, sort_order } = req.body;
      if (!sector || !domain_name || !signal_label) return fail(res, new Error('sector, domain_name and signal_label are required'), 400);
      const r = await query(
        `INSERT INTO signal_library (sector, domain_name, signal_label, sort_order, is_active)
         VALUES ($1, $2, $3, COALESCE($4, 99), true) RETURNING *`,
        [sector, domain_name, signal_label, sort_order ?? null]
      );
      return ok(res, r.rows[0]);
    } catch (e) { return fail(res, e, 400); }
  },
  async updateSignal(req: Request, res: Response) {
    try {
      const { signal_label, sort_order, is_active } = req.body;
      const r = await query(
        `UPDATE signal_library SET
           signal_label = COALESCE($2, signal_label), sort_order = COALESCE($3, sort_order),
           is_active = COALESCE($4, is_active)
         WHERE id = $1 RETURNING *`,
        [req.params.id, signal_label ?? null, sort_order ?? null,
         typeof is_active === 'boolean' ? is_active : null]
      );
      if (!r.rows[0]) return fail(res, new Error('Signal not found'), 404);
      return ok(res, r.rows[0]);
    } catch (e) { return fail(res, e, 400); }
  },

  // ---- Pattern Thresholds (threshold_rules) — drives the clustering engine ----
  async listThresholds(req: Request, res: Response) {
    try {
      const sector = req.query.sector as string | undefined;
      const r = await query(
        `SELECT id, sector, domain_name, trigger_signal_count, window_days, description, is_active
         FROM threshold_rules ${sector ? 'WHERE sector = $1' : ''} ORDER BY sector, domain_name`,
        sector ? [sector] : []
      );
      return ok(res, r.rows);
    } catch (e) { return fail(res, e); }
  },
  async updateThreshold(req: Request, res: Response) {
    try {
      const { trigger_signal_count, window_days, is_active } = req.body;
      const r = await query(
        `UPDATE threshold_rules SET
           trigger_signal_count = COALESCE($2, trigger_signal_count),
           window_days = COALESCE($3, window_days), is_active = COALESCE($4, is_active)
         WHERE id = $1 RETURNING *`,
        [req.params.id,
         Number.isFinite(+trigger_signal_count) && trigger_signal_count != null ? +trigger_signal_count : null,
         Number.isFinite(+window_days) && window_days != null ? +window_days : null,
         typeof is_active === 'boolean' ? is_active : null]
      );
      if (!r.rows[0]) return fail(res, new Error('Threshold rule not found'), 404);
      return ok(res, r.rows[0]);
    } catch (e) { return fail(res, e, 400); }
  },

  // ---- Escalation SLAs (escalation_sla_rules) ----
  async listSLAs(_req: Request, res: Response) {
    try {
      const r = await query(`SELECT trigger_type, hours, description, is_active, updated_at FROM escalation_sla_rules ORDER BY hours, trigger_type`);
      return ok(res, r.rows);
    } catch (e) { return fail(res, e); }
  },
  async updateSLA(req: Request, res: Response) {
    try {
      const { hours, is_active } = req.body;
      const r = await query(
        `UPDATE escalation_sla_rules SET
           hours = COALESCE($2, hours), is_active = COALESCE($3, is_active), updated_at = NOW()
         WHERE trigger_type = $1 RETURNING *`,
        [req.params.trigger,
         Number.isFinite(+hours) && hours != null ? +hours : null,
         typeof is_active === 'boolean' ? is_active : null]
      );
      if (!r.rows[0]) return fail(res, new Error('SLA rule not found'), 404);
      await refreshEscalationSLAs(); // engine picks up the new value immediately
      return ok(res, r.rows[0]);
    } catch (e) { return fail(res, e, 400); }
  },

  // ---- Audit Log (read-only, tenant-scoped) ----
  async listAudit(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id;
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
      const r = await query(
        `SELECT a.id, a.action, a.resource, a.entity_type, a.created_at,
                COALESCE(u.first_name || ' ' || u.last_name, 'System') AS actor
         FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
         WHERE a.company_id = $1 ORDER BY a.created_at DESC LIMIT $2`,
        [company_id, limit]
      );
      return ok(res, r.rows);
    } catch (e) { return fail(res, e); }
  },

  // ---- Action Templates (tenant-owned; reusable actions per domain) ----
  async listActionTemplates(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const r = await query(
        `SELECT id, domain_name, title, description, is_active FROM action_templates
          WHERE company_id = $1 ORDER BY domain_name NULLS LAST, title`, [company_id]);
      return ok(res, r.rows);
    } catch (e) { return fail(res, e); }
  },
  async createActionTemplate(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const { domain_name, title, description } = req.body;
      if (!title) return fail(res, new Error('title is required'), 400);
      const r = await query(
        `INSERT INTO action_templates (company_id, domain_name, title, description, is_active)
         VALUES ($1,$2,$3,$4,true) RETURNING *`,
        [company_id, domain_name || null, title, description || null]);
      return ok(res, r.rows[0]);
    } catch (e) { return fail(res, e, 400); }
  },
  async updateActionTemplate(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const { domain_name, title, description, is_active } = req.body;
      const r = await query(
        `UPDATE action_templates SET
           domain_name = COALESCE($3, domain_name), title = COALESCE($4, title),
           description = COALESCE($5, description), is_active = COALESCE($6, is_active)
         WHERE id = $1 AND company_id = $2 RETURNING *`,
        [req.params.id, company_id, domain_name ?? null, title ?? null, description ?? null,
         typeof is_active === 'boolean' ? is_active : null]);
      if (!r.rows[0]) return fail(res, new Error('Template not found'), 404);
      return ok(res, r.rows[0]);
    } catch (e) { return fail(res, e, 400); }
  },
  async deleteActionTemplate(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const r = await query(`DELETE FROM action_templates WHERE id = $1 AND company_id = $2 RETURNING id`, [req.params.id, company_id]);
      if (!r.rows[0]) return fail(res, new Error('Template not found'), 404);
      return ok(res, { deleted: true });
    } catch (e) { return fail(res, e, 400); }
  },

  // ---- Review Cycles (tenant-owned governance cadences) ----
  async listReviewCycles(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const r = await query(
        `SELECT id, name, cadence, day_of_week, description, is_active FROM review_cycles
          WHERE company_id = $1 ORDER BY
            CASE cadence WHEN 'Daily' THEN 1 WHEN 'Weekly' THEN 2 WHEN 'Fortnightly' THEN 3
                         WHEN 'Monthly' THEN 4 WHEN 'Quarterly' THEN 5 ELSE 6 END, name`, [company_id]);
      return ok(res, r.rows);
    } catch (e) { return fail(res, e); }
  },
  async createReviewCycle(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const { name, cadence, day_of_week, description } = req.body;
      if (!name || !cadence) return fail(res, new Error('name and cadence are required'), 400);
      const r = await query(
        `INSERT INTO review_cycles (company_id, name, cadence, day_of_week, description, is_active)
         VALUES ($1,$2,$3,$4,$5,true) RETURNING *`,
        [company_id, name, cadence, day_of_week || null, description || null]);
      return ok(res, r.rows[0]);
    } catch (e) { return fail(res, e, 400); }
  },
  async updateReviewCycle(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const { name, cadence, day_of_week, description, is_active } = req.body;
      const r = await query(
        `UPDATE review_cycles SET
           name = COALESCE($3, name), cadence = COALESCE($4, cadence),
           day_of_week = COALESCE($5, day_of_week), description = COALESCE($6, description),
           is_active = COALESCE($7, is_active)
         WHERE id = $1 AND company_id = $2 RETURNING *`,
        [req.params.id, company_id, name ?? null, cadence ?? null, day_of_week ?? null,
         description ?? null, typeof is_active === 'boolean' ? is_active : null]);
      if (!r.rows[0]) return fail(res, new Error('Review cycle not found'), 404);
      return ok(res, r.rows[0]);
    } catch (e) { return fail(res, e, 400); }
  },
  async deleteReviewCycle(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const r = await query(`DELETE FROM review_cycles WHERE id = $1 AND company_id = $2 RETURNING id`, [req.params.id, company_id]);
      if (!r.rows[0]) return fail(res, new Error('Review cycle not found'), 404);
      return ok(res, { deleted: true });
    } catch (e) { return fail(res, e, 400); }
  },

  // ---- Immediate Detection Rules (fast-path escalation; migration 068) ----
  // Platform defaults (company_id IS NULL) are read-only; companies clone-to-override.
  async listImmediateRules(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const r = await query(
        `SELECT * FROM immediate_detection_rules
          WHERE company_id IS NULL OR company_id = $1
          ORDER BY (company_id IS NULL) DESC, sector,
                   CASE domain_name WHEN '*' THEN 'zzz' ELSE domain_name END,
                   min_severity NULLS FIRST`,
        [company_id]);
      return ok(res, r.rows);
    } catch (e) { return fail(res, e); }
  },
  async createImmediateRule(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const b = req.body;
      if (!b.sector || !b.domain_name) return fail(res, new Error('sector and domain_name are required'), 400);
      const r = await query(
        `INSERT INTO immediate_detection_rules
           (company_id, sector, domain_name, min_severity, signal_count, window_hours, match_any_severity,
            action, escalate_to_role, sla_trigger_type, priority, rationale, is_active, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,COALESCE($13,true),$14) RETURNING *`,
        [company_id, b.sector, b.domain_name, b.min_severity || null,
         Number.isFinite(+b.signal_count) ? +b.signal_count : 1,
         Number.isFinite(+b.window_hours) ? +b.window_hours : 1,
         b.match_any_severity === true,
         b.action || 'ESCALATE', b.escalate_to_role || 'REGISTERED_MANAGER',
         b.sla_trigger_type || 'HIGH_SAFEGUARDING', b.priority || 'High',
         b.rationale || null, typeof b.is_active === 'boolean' ? b.is_active : null, req.user!.user_id]);
      return ok(res, r.rows[0]);
    } catch (e) { return fail(res, e, 400); }
  },
  async updateImmediateRule(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const existing = await query(`SELECT company_id FROM immediate_detection_rules WHERE id = $1`, [req.params.id]);
      if (!existing.rows[0]) return fail(res, new Error('Rule not found'), 404);
      if (existing.rows[0].company_id === null)
        return fail(res, new Error('Platform default rules are read-only — create a company override instead.'), 403);
      if (existing.rows[0].company_id !== company_id) return fail(res, new Error('Not permitted'), 403);
      const b = req.body;
      const r = await query(
        `UPDATE immediate_detection_rules SET
           min_severity = $3,
           signal_count = COALESCE($4, signal_count),
           window_hours = COALESCE($5, window_hours),
           match_any_severity = COALESCE($6, match_any_severity),
           action = COALESCE($7, action),
           escalate_to_role = COALESCE($8, escalate_to_role),
           sla_trigger_type = COALESCE($9, sla_trigger_type),
           priority = COALESCE($10, priority),
           rationale = COALESCE($11, rationale),
           is_active = COALESCE($12, is_active),
           updated_at = NOW()
         WHERE id = $1 AND company_id = $2 RETURNING *`,
        [req.params.id, company_id, b.min_severity || null,
         Number.isFinite(+b.signal_count) && b.signal_count != null ? +b.signal_count : null,
         Number.isFinite(+b.window_hours) && b.window_hours != null ? +b.window_hours : null,
         typeof b.match_any_severity === 'boolean' ? b.match_any_severity : null,
         b.action ?? null, b.escalate_to_role ?? null, b.sla_trigger_type ?? null,
         b.priority ?? null, b.rationale ?? null,
         typeof b.is_active === 'boolean' ? b.is_active : null]);
      if (!r.rows[0]) return fail(res, new Error('Rule not found'), 404);
      return ok(res, r.rows[0]);
    } catch (e) { return fail(res, e, 400); }
  },
  async deleteImmediateRule(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const existing = await query(`SELECT company_id FROM immediate_detection_rules WHERE id = $1`, [req.params.id]);
      if (!existing.rows[0]) return fail(res, new Error('Rule not found'), 404);
      if (existing.rows[0].company_id === null)
        return fail(res, new Error('Platform default rules cannot be deleted.'), 403);
      const r = await query(`DELETE FROM immediate_detection_rules WHERE id = $1 AND company_id = $2 RETURNING id`,
        [req.params.id, company_id]);
      if (!r.rows[0]) return fail(res, new Error('Rule not found'), 404);
      return ok(res, { deleted: true });
    } catch (e) { return fail(res, e, 400); }
  },
};
