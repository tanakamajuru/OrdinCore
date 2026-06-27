import { Router } from 'express';
import { reportsController } from '../controllers/reports.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

/**
 * @openapi
 * /api/v1/reports/request:
 *   post:
 *     tags:
 *       - Reports
 *     summary: POST /api/v1/reports/request
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/request', requireAuth, requireTenant, reportsController.request.bind(reportsController));
/**
 * @openapi
 * /api/v1/reports:
 *   get:
 *     tags:
 *       - Reports
 *     summary: GET /api/v1/reports
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/', requireAuth, requireTenant, reportsController.findAll.bind(reportsController));

// ─── Canonical four reports (spec module 10) — declared before '/:id' ─────────
router.get('/weekly-governance', requireAuth, requireTenant, reportsController.weeklyGovernance.bind(reportsController));
router.get('/strategic-risks', requireAuth, requireTenant, reportsController.strategicRisks.bind(reportsController));
router.get('/escalations', requireAuth, requireTenant, reportsController.escalationsReport.bind(reportsController));
router.get('/reconstruction', requireAuth, requireTenant, reportsController.reconstructionReport.bind(reportsController));
router.get('/cross-service-control', requireAuth, requireTenant, reportsController.crossServiceControl.bind(reportsController));
router.get('/inspection-evidence', requireAuth, requireTenant, reportsController.inspectionEvidence.bind(reportsController));
router.post('/narrative', requireAuth, requireTenant, reportsController.narrative.bind(reportsController));
router.get('/saved-reconstructions', requireAuth, requireTenant, reportsController.savedReconstructions.bind(reportsController));
/**
 * @openapi
 * /api/v1/reports/{id}:
 *   get:
 *     tags:
 *       - Reports
 *     summary: GET /api/v1/reports/{id}
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/:id', requireAuth, requireTenant, reportsController.findById.bind(reportsController));
/**
 * @openapi
 * /api/v1/reports/{id}/download:
 *   get:
 *     tags:
 *       - Reports
 *     summary: GET /api/v1/reports/{id}/download
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/:id/download', requireAuth, requireTenant, reportsController.download.bind(reportsController));

export default router;
