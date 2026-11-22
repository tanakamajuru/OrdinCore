import { Router } from 'express';
import { incidentReviewsController } from '../controllers/incidentReviews.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// 22 Nov 2026 brief -> Serious Incident workflow, Steps 3-4.
// Write actions (assign/draft/waiting/actions/link-learning/complete) are restricted to the
// roles this brief names explicitly as authorised to run a serious incident review.
const reviewWriters = requireRole('REGISTERED_MANAGER', 'DIRECTOR', 'ADMIN', 'SUPER_ADMIN');
// Reads (case summary, active/history, PDF) also permit the Responsible Individual — oversight
// visibility, consistent with RI already having read access to incidents/escalations elsewhere.
const reviewReaders = requireRole('REGISTERED_MANAGER', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL', 'ADMIN', 'SUPER_ADMIN');

router.patch('/:id', requireAuth, requireTenant, reviewWriters, incidentReviewsController.saveDraft.bind(incidentReviewsController));
router.post('/:id/waiting', requireAuth, requireTenant, reviewWriters, incidentReviewsController.setWaiting.bind(incidentReviewsController));
router.post('/:id/actions', requireAuth, requireTenant, reviewWriters, incidentReviewsController.addAction.bind(incidentReviewsController));
router.post('/:id/link-learning', requireAuth, requireTenant, reviewWriters, incidentReviewsController.linkLearning.bind(incidentReviewsController));
router.post('/:id/complete', requireAuth, requireTenant, reviewWriters, incidentReviewsController.complete.bind(incidentReviewsController));
router.get('/:id/pdf', requireAuth, requireTenant, reviewReaders, incidentReviewsController.downloadPdf.bind(incidentReviewsController));

export default router;
