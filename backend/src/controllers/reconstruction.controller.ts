import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { reconstructionService, ReconstructionScope } from '../services/reconstruction.service';

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
      const r = await query(
        `INSERT INTO governance_reconstructions
           (id, company_id, scope, scope_ref, scope_label, incident_date, trajectory,
            contributing_factors, control_failure, narrative, timeline_events, summary, linked_risk_ids, status, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'Draft',$14) RETURNING *`,
        [id, company_id, b.scope, String(b.scope_ref), b.scope_label || null, b.incident_date || null,
         b.trajectory || null, b.contributing_factors || null, b.control_failure || null, b.narrative || '',
         JSON.stringify(b.timeline_events || []), JSON.stringify(b.summary || {}), JSON.stringify(b.linked_risk_ids || []),
         req.user!.user_id]
      );
      return res.status(201).json({ success: true, data: r.rows[0] });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to save reconstruction' });
    }
  }

  async getRecord(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const r = await query(`SELECT * FROM governance_reconstructions WHERE id = $1 AND company_id = $2`, [req.params.id, company_id]);
      if (!r.rows[0]) return res.status(404).json({ success: false, message: 'Reconstruction not found' });
      return res.json({ success: true, data: r.rows[0] });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Error fetching reconstruction' });
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
      return res.json({ success: true, data: r.rows[0] });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to lock reconstruction' });
    }
  }
}

export const reconstructionController = new ReconstructionController();
