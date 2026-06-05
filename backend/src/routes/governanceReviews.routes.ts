import { Router } from 'express';
import { governanceReviewsController } from '../controllers/governanceReviews.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireMinRole } from '../middleware/role.middleware';

const router = Router();

/**
 * @openapi
 * /api/v1/governance-reviews/queue:
 *   get:
 *     tags: [Governance Reviews]
 *     summary: Themes awaiting an RM governance review
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Success }
 */
router.get('/queue', requireAuth, requireTenant, governanceReviewsController.getQueue.bind(governanceReviewsController));

/**
 * @openapi
 * /api/v1/governance-reviews:
 *   get:
 *     tags: [Governance Reviews]
 *     summary: List governance reviews
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Success }
 *   post:
 *     tags: [Governance Reviews]
 *     summary: Record a leadership governance review (spec module 5)
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       201: { description: Created }
 */
router.get('/', requireAuth, requireTenant, governanceReviewsController.list.bind(governanceReviewsController));
router.post('/', requireAuth, requireTenant, requireMinRole('REGISTERED_MANAGER'), governanceReviewsController.create.bind(governanceReviewsController));

/**
 * @openapi
 * /api/v1/governance-reviews/{id}:
 *   get:
 *     tags: [Governance Reviews]
 *     summary: Get a governance review
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Success }
 */
router.get('/:id', requireAuth, requireTenant, governanceReviewsController.getById.bind(governanceReviewsController));

export default router;
