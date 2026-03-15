import { Router } from 'express';
import { systemController } from '../controllers/system.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// Only SUPER_ADMIN can access and manage general system settings and logs
/**
 * @openapi
 * /api/v1/system/settings:
 *   get:
 *     tags:
 *       - System
 *     summary: GET /api/v1/system/settings
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/settings', requireAuth, requireRole('SUPER_ADMIN'), systemController.getSettings.bind(systemController));
/**
 * @openapi
 * /api/v1/system/settings:
 *   patch:
 *     tags:
 *       - System
 *     summary: PATCH /api/v1/system/settings
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.patch('/settings', requireAuth, requireRole('SUPER_ADMIN'), systemController.updateSettings.bind(systemController));

/**
 * @openapi
 * /api/v1/system/audit-logs:
 *   get:
 *     tags:
 *       - System
 *     summary: GET /api/v1/system/audit-logs
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/audit-logs', requireAuth, requireRole('SUPER_ADMIN'), systemController.getAuditLogs.bind(systemController));
/**
 * @openapi
 * /api/v1/system/job-logs:
 *   get:
 *     tags:
 *       - System
 *     summary: GET /api/v1/system/job-logs
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/job-logs', requireAuth, requireRole('SUPER_ADMIN'), systemController.getJobLogs.bind(systemController));

export default router;
