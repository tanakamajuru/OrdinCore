import { Request, Response } from 'express';
import { query } from '../config/database';

// Frontline roles are scoped to the houses they are assigned to; managers see the whole company.
const SCOPED_ROLES = ['SUPPORT_WORKER', 'TEAM_LEADER'];

// House notes — the shift/handover log surfaced on the Team Leader mobile "Notes" screen.
export class NotesController {
  async list(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const role = (req.user!.role || '').toUpperCase().replace(/-/g, '_');
      const houseId = req.query.house_id as string | undefined;

      const conditions = ['n.company_id = $1'];
      const params: unknown[] = [company_id];
      let idx = 2;

      if (SCOPED_ROLES.includes(role)) {
        conditions.push(`n.house_id = ANY($${idx++}::uuid[])`);
        params.push(req.user!.assigned_house_ids || []);
      }
      if (houseId && houseId !== 'all') {
        conditions.push(`n.house_id = $${idx++}`);
        params.push(houseId);
      }

      const result = await query(
        `SELECT n.id, n.house_id, n.category, n.note, n.created_at,
                h.name AS house_name,
                TRIM(CONCAT(u.first_name, ' ', u.last_name)) AS author_name
           FROM house_notes n
           JOIN houses h ON h.id = n.house_id
           LEFT JOIN users u ON u.id = n.author_id
          WHERE ${conditions.join(' AND ')}
          ORDER BY n.created_at DESC
          LIMIT 200`,
        params
      );
      return res.json({ success: true, data: result.rows, meta: { total: result.rows.length } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch notes';
      return res.status(500).json({ success: false, message, errors: [] });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const user_id = req.user!.user_id;
      const role = (req.user!.role || '').toUpperCase().replace(/-/g, '_');
      const { note, category } = req.body || {};
      let { house_id } = req.body || {};

      if (!note || !String(note).trim()) {
        return res.status(400).json({ success: false, message: 'A note is required.', errors: [] });
      }
      // Resolve the house from the author's assignment when omitted (single-house staff).
      const assigned = req.user!.assigned_house_ids || [];
      if (!house_id) {
        if (assigned.length === 1) house_id = assigned[0];
        else return res.status(422).json({ success: false, message: 'Please choose which house this note is for.', errors: [] });
      }
      // Scoped roles may only note against a house they are assigned to.
      if (SCOPED_ROLES.includes(role) && !assigned.includes(house_id)) {
        return res.status(403).json({ success: false, message: 'You can only add notes for a house you are assigned to.', errors: [] });
      }

      const cat = ['handover', 'shift', 'general'].includes(String(category)) ? category : 'general';
      const result = await query(
        `INSERT INTO house_notes (company_id, house_id, author_id, category, note)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [company_id, house_id, user_id, cat, String(note).trim()]
      );
      return res.status(201).json({ success: true, data: result.rows[0], meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add note';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }
}

export const notesController = new NotesController();
