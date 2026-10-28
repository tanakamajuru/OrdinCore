import { Router, Request, Response } from 'express';
import { interventionsController } from '../controllers/interventions.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();
// The Intervention Panel is a management/oversight surface — RM manages service-level themes,
// Director/RI read cross-service and organisational trajectory. Not exposed to SW/TL.
const oversight = [requireAuth, requireTenant, requireRole('REGISTERED_MANAGER', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL', 'ADMIN', 'SUPER_ADMIN')];

// 27 Oct developer instructions (P1, "Complete the read-only conversion"): after the
// reconciliation inventory (above) confirmed no outstanding work is orphaned by removing these
// controls, Management Response Overview becomes read-only. These three write pathways are
// retired server-side -- not deleted, so a stale client request gets a clear, explicit 410
// (never a bare 404) naming the existing screen to use instead. All GET routes are unchanged:
// history, reconciliation and dashboards keep reading exactly as before.
const retired = (whatToUseInstead: string) => (req: Request, res: Response) => {
  res.status(410).json({
    success: false,
    message: `This write action has been retired. Management Response Overview is now read-only; make this change via ${whatToUseInstead}.`,
    errors: [],
  });
};

router.get('/themes', ...oversight, interventionsController.themes);
// 27 Oct developer instructions (P1, "Reconcile historical plans"): read-only classification
// inventory, declared before '/:id' so 'reconciliation' isn't read as an intervention id.
router.get('/reconciliation', ...oversight, interventionsController.reconciliation);
router.get('/governance-health', ...oversight, interventionsController.governanceHealth);
router.post('/', ...oversight, retired('the Risk Register'));

// Explicit multi-action linkage (brief 2 §1): oversight roles can still read the linked delivery
// actions and their audit history -- changing which actions are linked is retired.
router.get('/:id/actions', ...oversight, interventionsController.listActions);
router.get('/:id/actions/history', ...oversight, interventionsController.linkHistory);
router.post('/:id/actions', ...oversight, retired('the Action Tracker'));
router.delete('/:id/actions/:actionId', ...oversight, retired('the Action Tracker'));

export default router;
