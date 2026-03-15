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
