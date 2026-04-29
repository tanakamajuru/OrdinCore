import { Router } from 'express';
import { riGovernanceController } from '../controllers/riGovernance.controller';
import { exportsController } from '../controllers/exports.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// Auth & Tenant are global for these
router.use(requireAuth, requireTenant);

// RI-only routes
router.get('/dashboard/overview', requireRole('DIRECTOR', 'RESPONSIBLE_INDIVIDUAL'), riGovernanceController.getDashboardOverview);
router.post('/incidents/:incident_id/acknowledge', requireRole('DIRECTOR', 'RESPONSIBLE_INDIVIDUAL'), riGovernanceController.acknowledgeIncident);
router.post('/weekly-reviews/:review_id/query', requireRole('DIRECTOR', 'RESPONSIBLE_INDIVIDUAL'), riGovernanceController.createQuery);
router.get('/houses/:house_id/evidence-pack', requireRole('DIRECTOR', 'RESPONSIBLE_INDIVIDUAL'), riGovernanceController.getEvidencePack);
router.get('/houses/:house_id/export', requireRole('DIRECTOR', 'RESPONSIBLE_INDIVIDUAL'), exportsController.exportEvidencePack);

// RM-side routes (also allow RI/Director to see for transparency)
router.get('/rm/queries', requireRole('REGISTERED_MANAGER', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL'), riGovernanceController.getRmQueries);
router.post('/queries/:query_id/respond', requireRole('REGISTERED_MANAGER', 'DIRECTOR'), riGovernanceController.respondToQuery);

export default router;
