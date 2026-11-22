import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { reconstructionService, ReconstructionScope } from '../services/reconstruction.service';
import { renderSnapshotPdf } from '../reporting/renderers/frozen-pdf.renderer';
import { createHash } from 'crypto';

const VALID_SCOPES: ReconstructionScope[] = ['client', 'service', 'theme', 'incident'];

export class ReconstructionController {
  async reconstruct(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const scope = req.params.scope as ReconstructionScope;
      if (!VALID_SCOPES.includes(scope)) {
        return res.status(400).json({ success: false, message: `Invalid scope: ${scope}`, errors: [] });
      }
      const data = await reconstructionService.reconstruct(
        company_id,
        scope,
        req.params.id,
        req.query.start as string | undefined,
        req.query.end as string | undefined
      );
      return res.json({ success: true, data, meta: {} });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to build reconstruction', errors: [] });
    }
  }

  // Distinct service-user references that appear in signals (for the by-person picker).
  async listPersons(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const r = await query(
        `SELECT DISTINCT related_person FROM governance_pulses
          WHERE company_id = $1 AND related_person IS NOT NULL AND related_person <> ''
          ORDER BY related_person`,
        [company_id]
      );
      return res.json({ success: true, data: r.rows.map((x) => x.related_person) });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Error fetching persons' });
    }
  }

  // --- Saved reconstruction records (by-house / by-person wizard, FR9) ---
  async saveRecord(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const b = req.body || {};
      if (!b.scope || !b.scope_ref) return res.status(400).json({ success: false, message: 'scope and scope_ref are required' });
      const id = uuidv4();
      // Issue 01 (21 Nov 2026 brief): snapshot the actual selected scope period (From date ->
      // Incident date) at save/lock time, not a shortcut later derived from timeline rows.
      const r = await query(
        `INSERT INTO governance_reconstructions
           (id, company_id, scope, scope_ref, scope_label, incident_date, from_date, trajectory,
            contributing_factors, control_failure, narrative, timeline_events, summary, linked_risk_ids,
            lessons_learned, recommendations, governance_outputs, status, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'Draft',$18) RETURNING *`,
        [id, company_id, b.scope, String(b.scope_ref), b.scope_label || null, b.incident_date || null,
         b.from_date || null, b.trajectory || null, b.contributing_factors || null, b.control_failure || null,
         b.narrative || '', JSON.stringify(b.timeline_events || []), JSON.stringify(b.summary || {}),
         JSON.stringify(b.linked_risk_ids || []), b.lessons_learned || null, JSON.stringify(b.recommendations || []),
         b.governance_outputs ? JSON.stringify(b.governance_outputs) : null, req.user!.user_id]
      );
      return res.status(201).json({ success: true, data: r.rows[0] });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to save reconstruction' });
    }
  }

  async getRecord(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const r = await query(
        `SELECT gr.*, u.first_name || ' ' || u.last_name AS locked_by_name
           FROM governance_reconstructions gr
           LEFT JOIN users u ON u.id = gr.locked_by
          WHERE gr.id = $1 AND gr.company_id = $2`,
        [req.params.id, company_id]
      );
      if (!r.rows[0]) return res.status(404).json({ success: false, message: 'Reconstruction not found' });
      return res.json({ success: true, data: r.rows[0] });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Error fetching reconstruction' });
    }
  }

  async downloadLockedPdf(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const record = (await query(
        `SELECT * FROM governance_reconstructions WHERE id = $1 AND company_id = $2 AND status = 'Locked'`,
        [req.params.id, company_id]
      )).rows[0];
      if (!record) return res.status(404).json({ success: false, message: 'Locked reconstruction not found.' });
      const timeline = Array.isArray(record.timeline_events) ? record.timeline_events : [];

      // Issue 01 (21 Nov 2026 brief) root cause: the wizard's merged timeline rows (from
      // reconstruction.service.ts reconstruct()) carry `event_time`, never `date`/`created_at` --
      // reading x.date/x.created_at here always produced NaN, so the timeline came up empty and
      // the period below silently fell back to incident_date/locked_at instead of the scope the
      // RI/Director actually selected. The reporting period is now the snapshotted selection
      // (from_date -> incident_date), never derived from timeline rows as a shortcut.
      const start = record.from_date ? new Date(record.from_date).toISOString() : (record.incident_date || record.created_at);
      const end = record.incident_date ? new Date(record.incident_date).toISOString() : (record.locked_at || record.created_at);

      // Project the merged timeline (item_type signal/review/escalation, each carrying event_time)
      // into the evidence buckets the renderer expects, instead of the previous hardcoded empty
      // lists -- a legitimately empty scope/period still renders empty, honestly.
      const evidence = {
        signals: timeline.filter((t: any) => t.item_type === 'signal').map((t: any) => ({
          date: t.event_time, concern: t.description, service: t.house_id, severity: t.status,
          reported_by: t.related_person,
        })),
        decisions: timeline.filter((t: any) => t.item_type === 'review').map((t: any) => ({
          date: t.event_time, concern: t.description, decision: t.status, reason: t.rationale,
          reviewer: t.reviewer, management_instruction: t.immediate_action, due_at: t.follow_up_due,
        })),
        escalations: timeline.filter((t: any) => t.item_type === 'escalation').map((t: any) => ({
          date: t.event_time, reason: t.theme, status: t.status, escalated_to: null,
        })),
        actions: [], risks: [], weekly_reviews: [],
      };

      // Issue 01: populate Organisation / Produced by / Date-and-time-produced metadata (same
      // provenance pattern used by frozen-report.service.ts for every other report type).
      const producer = (await query(
        `SELECT c.name AS organisation_name,
                TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')) AS produced_by_name, u.role AS produced_by_role
           FROM companies c
           LEFT JOIN users u ON u.id = $2 AND u.company_id = c.id
          WHERE c.id = $1`,
        [company_id, record.locked_by || record.created_by]
      )).rows[0] || {};

      const data: any = {
        scope_label: record.scope_label || `${record.scope}: ${record.scope_ref}`,
        period: { start, end }, organisation: { status: 'RECORDED' }, per_site: [], material_exceptions: [],
        evidence, reconstruction_record: { ...record, timeline_events: timeline }, limitations: [],
        report_metadata: {
          organisation: producer.organisation_name || 'Not recorded',
          produced_at: record.locked_at || record.created_at,
          produced_by_name: producer.produced_by_name || 'Not recorded',
          produced_by_role: producer.produced_by_role || 'Not recorded',
        },
      };
      const evidence_hash = createHash('sha256').update(JSON.stringify(data)).digest('hex');
      const buffer = await renderSnapshotPdf({ report_key: 'governance-reconstruction', scope_type: record.scope,
        status: record.status.toUpperCase(), approved_at: record.locked_at, period_start: start, period_end: end,
        evidence_hash, narrative: record.narrative, data });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="governance-reconstruction-${record.id}.pdf"`);
      return res.send(buffer);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to create reconstruction PDF' });
    }
  }

  async lockRecord(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const existing = await query(`SELECT status, narrative FROM governance_reconstructions WHERE id = $1 AND company_id = $2`, [req.params.id, company_id]);
      if (!existing.rows[0]) return res.status(404).json({ success: false, message: 'Reconstruction not found' });
      if (existing.rows[0].status === 'Locked') return res.status(400).json({ success: false, message: 'Already locked — immutable.' });
      if (!existing.rows[0].narrative || !existing.rows[0].narrative.trim()) {
        // allow narrative to be supplied on the lock call itself
        if (!req.body?.narrative?.trim()) return res.status(400).json({ success: false, message: 'Governance Block: a narrative is required before locking.' });
      }
      const r = await query(
        `UPDATE governance_reconstructions
            SET status = 'Locked', locked_at = NOW(), locked_by = $1,
                narrative = COALESCE(NULLIF($4,''), narrative)
          WHERE id = $2 AND company_id = $3 RETURNING *`,
        [req.user!.user_id, req.params.id, company_id, req.body?.narrative || '']
      );
      const lockedByName = (await query(
        `SELECT first_name || ' ' || last_name AS name FROM users WHERE id = $1`,
        [req.user!.user_id]
      )).rows[0]?.name || null;
      return res.json({ success: true, data: { ...r.rows[0], locked_by_name: lockedByName } });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to lock reconstruction' });
    }
  }
}

export const reconstructionController = new ReconstructionController();
