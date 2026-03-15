import { Router } from 'express';
import { housesController } from '../controllers/houses.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

/**
 * @openapi
 * /api/v1/houses:
 *   post:
 *     tags:
 *       - Houses
 *     summary: POST /api/v1/houses
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), housesController.create.bind(housesController));
/**
 * @openapi
 * /api/v1/houses:
 *   get:
 *     tags:
 *       - Houses
 *     summary: GET /api/v1/houses
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/', requireAuth, requireTenant, housesController.findAll.bind(housesController));
/**
 * @openapi
 * /api/v1/houses/{id}:
 *   get:
 *     tags:
 *       - Houses
 *     summary: GET /api/v1/houses/{id}
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
router.get('/:id', requireAuth, requireTenant, housesController.findById.bind(housesController));
/**
 * @openapi
 * /api/v1/houses/{id}:
 *   patch:
 *     tags:
 *       - Houses
 *     summary: PATCH /api/v1/houses/{id}
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
router.patch('/:id', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), housesController.update.bind(housesController));
/**
 * @openapi
 * /api/v1/houses/{id}:
 *   delete:
 *     tags:
 *       - Houses
 *     summary: DELETE /api/v1/houses/{id}
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
router.delete('/:id', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN'), housesController.delete.bind(housesController));
/**
 * @openapi
 * /api/v1/houses/{id}/staff:
 *   get:
 *     tags:
 *       - Houses
 *     summary: GET /api/v1/houses/{id}/staff
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
router.get('/:id/staff', requireAuth, requireTenant, housesController.getStaff.bind(housesController));
/**
 * @openapi
 * /api/v1/houses/{id}/staff:
 *   post:
 *     tags:
 *       - Houses
 *     summary: POST /api/v1/houses/{id}/staff
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
router.post('/:id/staff', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), housesController.assignStaff.bind(housesController));
/**
 * @openapi
 * /api/v1/houses/{id}/staff/{userId}:
 *   delete:
 *     tags:
 *       - Houses
 *     summary: DELETE /api/v1/houses/{id}/staff/{userId}
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.delete('/:id/staff/:userId', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), housesController.removeStaff.bind(housesController));

/**
 * @openapi
 * /api/v1/houses/{id}/settings:
 *   get:
 *     tags:
 *       - Houses
 *     summary: GET /api/v1/houses/{id}/settings
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
router.get('/:id/settings', requireAuth, requireTenant, housesController.getSettings.bind(housesController));
/**
 * @openapi
 * /api/v1/houses/{id}/settings:
 *   patch:
 *     tags:
 *       - Houses
 *     summary: PATCH /api/v1/houses/{id}/settings
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
router.patch('/:id/settings', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), housesController.updateSettings.bind(housesController));

/**
 * @openapi
 * /api/v1/houses/{id}/risks:
 *   get:
 *     tags:
 *       - Houses
 *     summary: GET /api/v1/houses/{id}/risks
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
router.get('/:id/risks', requireAuth, requireTenant, housesController.getRisks.bind(housesController));
/**
 * @openapi
 * /api/v1/houses/{id}/incidents:
 *   get:
 *     tags:
 *       - Houses
 *     summary: GET /api/v1/houses/{id}/incidents
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
router.get('/:id/incidents', requireAuth, requireTenant, housesController.getIncidents.bind(housesController));
/**
 * @openapi
 * /api/v1/houses/{id}/governance-pulses:
 *   get:
 *     tags:
 *       - Houses
 *     summary: GET /api/v1/houses/{id}/governance-pulses
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
router.get('/:id/governance-pulses', requireAuth, requireTenant, housesController.getGovernancePulses.bind(housesController));

// Extra utility endpoints
/**
 * @openapi
 * /api/v1/houses/metrics/overview:
 *   get:
 *     tags:
 *       - Houses
 *     summary: GET /api/v1/houses/metrics/overview
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/metrics/overview', requireAuth, requireTenant, housesController.getMetricsOverview.bind(housesController));
/**
 * @openapi
 * /api/v1/houses/locations/map:
 *   get:
 *     tags:
 *       - Houses
 *     summary: GET /api/v1/houses/locations/map
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/locations/map', requireAuth, requireTenant, housesController.getMapLocations.bind(housesController));

export default router;
