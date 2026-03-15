import { Router } from 'express';
import { exportsController } from '../controllers/exports.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// Require users to have at least MANAGER role to export raw data
const requireExportAccess = requireRole('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER');

/**
 * @openapi
 * /api/v1/exports/risks:
 *   get:
 *     tags:
 *       - Exports
 *     summary: GET /api/v1/exports/risks
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/risks', requireAuth, requireTenant, requireExportAccess, exportsController.exportRisks.bind(exportsController));
/**
 * @openapi
 * /api/v1/exports/incidents:
 *   get:
 *     tags:
 *       - Exports
 *     summary: GET /api/v1/exports/incidents
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/incidents', requireAuth, requireTenant, requireExportAccess, exportsController.exportIncidents.bind(exportsController));
/**
 * @openapi
 * /api/v1/exports/governance:
 *   get:
 *     tags:
 *       - Exports
 *     summary: GET /api/v1/exports/governance
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/governance', requireAuth, requireTenant, requireExportAccess, exportsController.exportGovernance.bind(exportsController));
/**
 * @openapi
 * /api/v1/exports/users:
 *   get:
 *     tags:
 *       - Exports
 *     summary: GET /api/v1/exports/users
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/users', requireAuth, requireTenant, requireExportAccess, exportsController.exportUsers.bind(exportsController));
/**
 * @openapi
 * /api/v1/exports/houses:
 *   get:
 *     tags:
 *       - Exports
 *     summary: GET /api/v1/exports/houses
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/houses', requireAuth, requireTenant, requireExportAccess, exportsController.exportHouses.bind(exportsController));

export default router;
