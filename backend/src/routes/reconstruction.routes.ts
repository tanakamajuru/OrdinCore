import { Router } from 'express';
import { reconstructionController } from '../controllers/reconstruction.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// Saved reconstruction records (by-house / by-person wizard, FR9). Registered BEFORE
// the catch-all /:scope/:id so these specific paths win. Create/lock are senior-only.
const recordWriters = requireRole('REGISTERED_MANAGER', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL', 'ADMIN', 'SUPER_ADMIN');
router.get('/persons', requireAuth, requireTenant, reconstructionController.listPersons.bind(reconstructionController));
router.post('/record', requireAuth, requireTenant, recordWriters, reconstructionController.saveRecord.bind(reconstructionController));
router.get('/record/:id', requireAuth, requireTenant, reconstructionController.getRecord.bind(reconstructionController));
router.post('/record/:id/lock', requireAuth, requireTenant, recordWriters, reconstructionController.lockRecord.bind(reconstructionController));

/**
 * @openapi
 * /api/v1/reconstruction/{scope}/{id}:
 *   get:
 *     tags: [Reconstruction]
 *     summary: Reconstruct the governance timeline for a client/service/theme/incident (spec module 9)
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: scope
 *         required: true
 *         schema: { type: string, enum: [client, service, theme, incident] }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: start
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: end
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Success }
 */
router.get('/:scope/:id', requireAuth, requireTenant, reconstructionController.reconstruct.bind(reconstructionController));

export default router;
