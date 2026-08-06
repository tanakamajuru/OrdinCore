import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireRole, blockOversightRole } from '../middleware/role.middleware';
import { governanceDecisionsService } from '../services/governanceDecisions.service';

const router = Router();

// Record a governance decision (and, when it is to act, create the linked TL task).
// §7 — recording decisions is operational; RI must switch to an operational role first.
router.post('/', requireAuth, requireTenant, requireRole('REGISTERED_MANAGER', 'ADMIN', 'SUPER_ADMIN', 'DIRECTOR'), blockOversightRole, async (req, res) => {
  try {
    const data = await governanceDecisionsService.create({
      company_id: req.user!.company_id!, user_id: req.user!.user_id, ...req.body,
    });
    return res.status(201).json({ success: true, data, meta: {} });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message || 'Failed to record decision', errors: [] });
  }
});

// List decisions for a day (default today) with linked task status.
router.get('/', requireAuth, requireTenant, async (req, res) => {
  try {
    const data = await governanceDecisionsService.list(req.user!.company_id!, {
      date: req.query.date as string, house_id: req.query.house_id as string,
    });
    return res.json({ success: true, data, meta: {} });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message || 'Failed to list decisions', errors: [] });
  }
});

export default router;
