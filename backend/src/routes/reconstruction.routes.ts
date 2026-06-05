import { Router } from 'express';
import { reconstructionController } from '../controllers/reconstruction.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

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
