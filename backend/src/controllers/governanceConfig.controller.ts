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
      const { sector, name, description, sort_order } = req.body;
      if (!sector || !name) return fail(res, new Error('sector and name are required'), 400);
      const r = await query(
        `INSERT INTO governance_domains (sector, name, description, sort_order, is_active)
         VALUES ($1, $2, $3, COALESCE($4, 99), true) RETURNING *`,
        [sector, name, description || null, sort_order ?? null]
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
};
