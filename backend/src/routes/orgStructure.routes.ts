import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireRole } from '../middleware/role.middleware';
import { query } from '../config/database';

// Admin CRUD for the site → service → region hierarchy the frozen reports scope on.
const router = Router();
const admin = [requireAuth, requireTenant, requireRole('ADMIN', 'SUPER_ADMIN', 'DIRECTOR')];

// Overview: services, regions, and houses with their current assignment.
router.get('/', ...admin, async (req, res) => {
  try {
    const company_id = req.user!.company_id!;
    const [services, regions, houses] = await Promise.all([
      query(`SELECT s.id, s.name, (SELECT COUNT(*)::int FROM houses h WHERE h.service_id = s.id) AS sites
               FROM services s WHERE s.company_id = $1 ORDER BY s.name`, [company_id]),
      query(`SELECT r.id, r.name, (SELECT COUNT(*)::int FROM houses h WHERE h.region_id = r.id) AS sites
               FROM regions r WHERE r.company_id = $1 ORDER BY r.name`, [company_id]),
      query(`SELECT id, name, service_id, region_id, sector FROM houses
              WHERE company_id = $1 AND COALESCE(status,'') <> 'closed' ORDER BY name`, [company_id]),
    ]);
    return res.json({ success: true, data: { services: services.rows, regions: regions.rows, houses: houses.rows }, meta: {} });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to load structure', errors: [] });
  }
});

const createIn = (table: 'services' | 'regions') => async (req: any, res: any) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (name.length < 2) return res.status(400).json({ success: false, message: 'A name is required.', errors: [] });
    const r = await query(`INSERT INTO ${table} (company_id, name) VALUES ($1, $2) RETURNING id, name`, [req.user.company_id, name]);
    return res.status(201).json({ success: true, data: r.rows[0], meta: {} });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message || 'Failed to create', errors: [] });
  }
};
router.post('/services', ...admin, createIn('services'));
router.post('/regions', ...admin, createIn('regions'));

const renameIn = (table: 'services' | 'regions') => async (req: any, res: any) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (name.length < 2) return res.status(400).json({ success: false, message: 'A name is required.', errors: [] });
    const r = await query(`UPDATE ${table} SET name = $1 WHERE id = $2 AND company_id = $3 RETURNING id, name`, [name, req.params.id, req.user.company_id]);
    if (!r.rows[0]) return res.status(404).json({ success: false, message: 'Not found', errors: [] });
    return res.json({ success: true, data: r.rows[0], meta: {} });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message || 'Failed', errors: [] });
  }
};
router.patch('/services/:id', ...admin, renameIn('services'));
router.patch('/regions/:id', ...admin, renameIn('regions'));

// Assign a site (house) to a service and/or region. Null clears the assignment.
router.post('/houses/:id/assign', ...admin, async (req, res) => {
  try {
    const company_id = req.user!.company_id!;
    const { service_id, region_id } = req.body || {};
    const r = await query(
      `UPDATE houses SET service_id = $1, region_id = $2, updated_at = NOW()
        WHERE id = $3 AND company_id = $4 RETURNING id, name, service_id, region_id`,
      [service_id || null, region_id || null, req.params.id, company_id]
    );
    if (!r.rows[0]) return res.status(404).json({ success: false, message: 'Site not found', errors: [] });
    return res.json({ success: true, data: r.rows[0], meta: {} });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message || 'Failed to assign', errors: [] });
  }
});

export default router;
