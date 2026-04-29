import { Router } from 'express';
import { directorGovernanceController } from '../controllers/directorGovernance.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// Global middleware for all director-governance routes
router.use(requireAuth, requireTenant, requireRole('DIRECTOR'));

/**
 * @swagger
 * /api/v1/director-governance/effectiveness-summary:
 *   get:
 *     summary: Get cross-site action effectiveness summary
 *     tags: [Director Governance]
 */
router.get('/effectiveness-summary', directorGovernanceController.getEffectivenessSummary);

/**
 * @swagger
 * /api/v1/director-governance/control-failures:
 *   get:
 *     summary: Get unresolved forensic control failure flags
 *     tags: [Director Governance]
 */
router.get('/control-failures', directorGovernanceController.getControlFailures);

/**
 * @swagger
 * /api/v1/director-governance/control-failures/:id/resolve:
 *   post:
 *     summary: Resolve a control failure
 *     tags: [Director Governance]
 */
router.post('/control-failures/:id/resolve', directorGovernanceController.resolveControlFailure);

/**
 * @swagger
 * /api/v1/director-governance/interventions:
 *   post:
 *     summary: Log a Director-to-service strategic intervention
 *     tags: [Director Governance]
 */
router.post('/interventions', directorGovernanceController.createIntervention);

/**
 * @swagger
 * /api/v1/director-governance/monthly-report/draft:
 *   get:
 *     summary: Get auto-generated monthly board report draft
 *     tags: [Director Governance]
 */
router.get('/monthly-report/draft', directorGovernanceController.generateMonthlyReportDraft);

/**
 * @swagger
 * /api/v1/director-governance/monthly-report/:id/finalise:
 *   post:
 *     summary: Finalise and archive the monthly board report
 *     tags: [Director Governance]
 */
router.post('/monthly-report/:id/finalise', directorGovernanceController.finaliseMonthlyReport);

/**
 * @swagger
 * /api/v1/director-governance/unacknowledged-incidents:
 *   get:
 *     summary: Get incidents that require statutory acknowledgment
 *     tags: [Director Governance]
 */
router.get('/unacknowledged-incidents', directorGovernanceController.getUnacknowledgedIncidents);

export default router;
