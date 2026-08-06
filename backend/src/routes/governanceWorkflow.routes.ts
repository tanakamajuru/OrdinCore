import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireRole, blockOversightRole } from '../middleware/role.middleware';
import { governanceWorkflowService } from '../services/governanceWorkflow.service';

const router = Router();

// Chapter 7 — Pattern Review (about the pattern, not one signal) + closure eligibility.
const reviewers = requireRole('REGISTERED_MANAGER', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL', 'ADMIN', 'SUPER_ADMIN');

router.get('/patterns/:id/closure-eligibility', requireAuth, requireTenant, async (req, res) => {
  try {
    const data = await governanceWorkflowService.assessPatternClosure(req.user!.company_id!, req.params.id);
    return res.json({ success: true, data, meta: {} });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message || 'Failed', errors: [] });
  }
});

router.post('/patterns/:id/review', requireAuth, requireTenant, reviewers, blockOversightRole, async (req, res) => {
  try {
    const { outcome, rationale, next_review_date } = req.body || {};
    const data = await governanceWorkflowService.reviewPattern(
      req.user!.company_id!, req.params.id, req.user!.user_id, outcome, rationale, next_review_date
    );
    return res.json({ success: true, data, meta: {} });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err?.message || 'Failed to review pattern', errors: [] });
  }
});

export default router;
