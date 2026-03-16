import { Router } from 'express';
import { weeklyReviewsController } from '../controllers/weeklyReviews.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.post('/', requireAuth, requireTenant, weeklyReviewsController.save);
router.get('/house/:houseId', requireAuth, requireTenant, weeklyReviewsController.findByHouse);
router.get('/:id', requireAuth, requireTenant, weeklyReviewsController.findById);

export default router;
