import { Request, Response } from 'express';
import { query } from '../config/database';

const SCOPED_ROLES = ['SUPPORT_WORKER', 'TEAM_LEADER'];
const CATEGORIES = ['care_plan', 'risk_assessment', 'policy', 'procedure', 'house_record', 'training_record', 'other'];

// Governance document library — care plans, risk assessments, policies etc. Surfaced on the
// Team Leader mobile "Documents" screen. House-scoped for frontline roles; company-wide docs
// (house_id IS NULL, e.g. policies) are visible to everyone in the company.
export class DocumentsController {
  async list(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const role = (req.user!.role || '').toUpperCase().replace(/-/g, '_');
      const houseId = req.query.house_id as string | undefined;
      const category = req.query.category as string | undefined;

      const conditions = ['d.company_id = $1'];
      const params: unknown[] = [company_id];
      let idx = 2;

      if (SCOPED_ROLES.includes(role)) {
        // Their assigned houses, plus company-wide documents.
        conditions.push(`(d.house_id = ANY($${idx++}::uuid[]) OR d.house_id IS NULL)`);
        params.push(req.user!.assigned_house_ids || []);
      }
      if (houseId && houseId !== 'all') {
        conditions.push(`(d.house_id = $${idx++} OR d.house_id IS NULL)`);
        params.push(houseId);
      }
      if (category && category !== 'all') {
        conditions.push(`d.category = $${idx++}`);
        params.push(category);
      }

      const result = await query(
        `SELECT d.id, d.house_id, d.title, d.category, d.file_url, d.status, d.updated_at,
                h.name AS house_name
           FROM documents d
           LEFT JOIN houses h ON h.id = d.house_id
          WHERE ${conditions.join(' AND ')}
          ORDER BY d.category ASC, d.updated_at DESC
          LIMIT 300`,
        params
      );
      return res.json({ success: true, data: result.rows, meta: { total: result.rows.length } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch documents';
      return res.status(500).json({ success: false, message, errors: [] });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const user_id = req.user!.user_id;
      const { title, category, file_url } = req.body || {};
      const house_id = req.body?.house_id || null;

      if (!title || !String(title).trim()) {
        return res.status(400).json({ success: false, message: 'A document title is required.', errors: [] });
      }
      const cat = CATEGORIES.includes(String(category)) ? category : 'other';
      const result = await query(
        `INSERT INTO documents (company_id, house_id, title, category, file_url, created_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [company_id, house_id, String(title).trim(), cat, file_url || null, user_id]
      );
      return res.status(201).json({ success: true, data: result.rows[0], meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add document';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }
}

export const documentsController = new DocumentsController();
