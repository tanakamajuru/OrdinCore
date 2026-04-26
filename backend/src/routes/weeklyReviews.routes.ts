import { Router } from 'express';
import { weeklyReviewsController } from '../controllers/weeklyReviews.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

import { requireRole } from '../middleware/role.middleware';

const router = Router();

router.post('/', requireAuth, requireTenant, requireRole('DIRECTOR', 'REGISTERED_MANAGER', 'RESPONSIBLE_INDIVIDUAL'), weeklyReviewsController.save);
router.patch('/:id', requireAuth, requireTenant, requireRole('DIRECTOR', 'REGISTERED_MANAGER', 'RESPONSIBLE_INDIVIDUAL'), weeklyReviewsController.update);
router.post('/:id/complete', requireAuth, requireTenant, requireRole('DIRECTOR', 'REGISTERED_MANAGER', 'RESPONSIBLE_INDIVIDUAL'), weeklyReviewsController.complete);
router.get('/preview', requireAuth, requireTenant, requireRole('DIRECTOR', 'REGISTERED_MANAGER', 'RESPONSIBLE_INDIVIDUAL'), weeklyReviewsController.prepareReview.bind(weeklyReviewsController));
router.get('/house/:houseId', requireAuth, requireTenant, weeklyReviewsController.findByHouse);
router.get('/:id', requireAuth, requireTenant, weeklyReviewsController.findById);

export default router;
