import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireRole } from '../middleware/role.middleware';
import { companyAdminService } from '../services/companyAdmin.service';

const router = Router();
// Platform Super Admin has no provider tenant and uses the platform workspace.
// Company administration is intentionally ADMIN-only.
const admin = [requireAuth, requireTenant, requireRole('ADMIN')] as const;

router.get('/overview', ...admin, async (req, res) => {
  try {
    const data = await companyAdminService.overview(req.user!.company_id!);
    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to load admin overview', errors: [] });
  }
});

router.get('/security-policy', ...admin, async (req, res) => {
  try {
    const data = await companyAdminService.getSecurityPolicy(req.user!.company_id!);
    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to load security policy', errors: [] });
  }
});

router.patch('/security-policy', ...admin, async (req, res) => {
  try {
    const data = await companyAdminService.updateSecurityPolicy(req.user!.company_id!, req.user!.user_id, req.body || {});
    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message || 'Failed to update security policy', errors: [] });
  }
});

router.get('/governance-schedule', ...admin, async (req, res) => {
  try {
    const data = await companyAdminService.getGovernanceSchedule(req.user!.company_id!);
    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to load the weekly review schedule', errors: [] });
  }
});

router.patch('/governance-schedule', ...admin, async (req, res) => {
  try {
    const data = await companyAdminService.updateGovernanceSchedule(req.user!.company_id!, req.user!.user_id, req.body || {});
    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message || 'Failed to update the weekly review schedule', errors: [] });
  }
});

router.get('/access-reviews', ...admin, async (req, res) => {
  try {
    const status = String(req.query.status || 'OPEN').toUpperCase() === 'COMPLETED' ? 'COMPLETED' : 'OPEN';
    const data = await companyAdminService.listAccessReviews(req.user!.company_id!, status);
    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to load access reviews', errors: [] });
  }
});

router.post('/access-reviews/:id/complete', ...admin, async (req, res) => {
  try {
    const data = await companyAdminService.completeAccessReview(req.user!.company_id!, req.params.id, req.user!.user_id, req.body?.note);
    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message || 'Failed to complete access review', errors: [] });
  }
});

// Full, paginated audit log behind the "Security alerts" / "Recent admin activity" cards.
router.get('/audit-log', ...admin, async (req, res) => {
  try {
    const data = await companyAdminService.auditLog(req.user!.company_id!, {
      action: req.query.action as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to load audit log', errors: [] });
  }
});

export default router;
