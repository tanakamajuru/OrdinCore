import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireRole } from '../middleware/role.middleware';
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

// Oversight roles (Director / Responsible Individual) may record a pattern review — leadership
// must be able to review and close promoted/systemic patterns from their own interface, so the
// blockOversightRole gate is intentionally NOT applied here (reviewers already scopes the roles).
router.post('/patterns/:id/review', requireAuth, requireTenant, reviewers, async (req, res) => {
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
