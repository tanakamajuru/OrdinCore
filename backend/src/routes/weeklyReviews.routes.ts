import { Router } from 'express';
import { weeklyReviewsController } from '../controllers/weeklyReviews.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

import { requireRole } from '../middleware/role.middleware';

const router = Router();

router.post('/', requireAuth, requireTenant, requireRole('DIRECTOR', 'REGISTERED_MANAGER', 'RESPONSIBLE_INDIVIDUAL'), weeklyReviewsController.save);
router.patch('/:id', requireAuth, requireTenant, requireRole('DIRECTOR', 'REGISTERED_MANAGER', 'RESPONSIBLE_INDIVIDUAL'), weeklyReviewsController.update);
router.post('/:id/complete', requireAuth, requireTenant, requireRole('DIRECTOR', 'REGISTERED_MANAGER', 'RESPONSIBLE_INDIVIDUAL'), weeklyReviewsController.complete);
router.post('/:id/finalise', requireAuth, requireTenant, requireRole('REGISTERED_MANAGER'), weeklyReviewsController.finalise.bind(weeklyReviewsController));
router.post('/:id/validate', requireAuth, requireTenant, requireRole('DIRECTOR', 'ADMIN', 'SUPER_ADMIN', 'RESPONSIBLE_INDIVIDUAL'), weeklyReviewsController.validate.bind(weeklyReviewsController));
// Publish a validated review to the house team (gated behind validation in the service).
router.post('/:id/publish', requireAuth, requireTenant, requireRole('REGISTERED_MANAGER', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL', 'ADMIN', 'SUPER_ADMIN'), weeklyReviewsController.publish.bind(weeklyReviewsController));
// Any authenticated team member can mark a published review as read.
router.post('/:id/acknowledge', requireAuth, requireTenant, weeklyReviewsController.acknowledge.bind(weeklyReviewsController));
router.get('/:id/acknowledgements', requireAuth, requireTenant, weeklyReviewsController.getAcknowledgements.bind(weeklyReviewsController));
// Finding M: read status (who has/hasn't read) + a targeted reminder to the unread.
router.get('/:id/read-status', requireAuth, requireTenant, weeklyReviewsController.getReadStatus.bind(weeklyReviewsController));
router.post('/:id/remind', requireAuth, requireTenant, requireRole('REGISTERED_MANAGER', 'DIRECTOR', 'ADMIN', 'SUPER_ADMIN'), weeklyReviewsController.remind.bind(weeklyReviewsController));
router.get('/:id/pdf', requireAuth, requireTenant, weeklyReviewsController.downloadPdf.bind(weeklyReviewsController));
router.get('/preview', requireAuth, requireTenant, requireRole('DIRECTOR', 'REGISTERED_MANAGER', 'RESPONSIBLE_INDIVIDUAL'), weeklyReviewsController.prepareReview.bind(weeklyReviewsController));
// Director/RI read-only service-level roll-up (defined before '/:id' so it isn't swallowed).
router.get('/service-rollup', requireAuth, requireTenant, requireRole('DIRECTOR', 'RESPONSIBLE_INDIVIDUAL', 'ADMIN', 'SUPER_ADMIN'), weeklyReviewsController.serviceRollup.bind(weeklyReviewsController));
router.get('/house/:houseId', requireAuth, requireTenant, weeklyReviewsController.findByHouse);
router.get('/:id', requireAuth, requireTenant, weeklyReviewsController.findById);

export default router;
