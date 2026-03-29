import { Router } from 'express';
import { weeklyReviewsController } from '../controllers/weeklyReviews.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

import { requireRole } from '../middleware/role.middleware';

const router = Router();

router.post('/', requireAuth, requireTenant, requireRole('DIRECTOR', 'RESPONSIBLE_INDIVIDUAL'), weeklyReviewsController.save);
router.get('/house/:houseId', requireAuth, requireTenant, weeklyReviewsController.findByHouse);
router.get('/:id', requireAuth, requireTenant, weeklyReviewsController.findById);

export default router;
