import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { myWorkService } from '../services/myWork.service';

const router = Router();

// GET /api/v1/my-work — the role-scoped "My Work" landing read model.
router.get('/', requireAuth, requireTenant, async (req, res) => {
  try {
    const data = await myWorkService.getForUser(req.user!.company_id!, req.user!.user_id, req.user!.role);
    return res.json({ success: true, data, meta: {} });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to load work queue', errors: [] });
  }
});

export default router;
