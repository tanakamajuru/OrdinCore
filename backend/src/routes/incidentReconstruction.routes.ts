import { Router } from 'express';
import { incidentReconstructionController } from '../controllers/incidentReconstruction.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

router.post('/', requireAuth, requireTenant, requireRole('REGISTERED_MANAGER', 'DIRECTOR'), incidentReconstructionController.create.bind(incidentReconstructionController));
router.get('/:id', requireAuth, requireTenant, incidentReconstructionController.findById.bind(incidentReconstructionController));
router.patch('/:id', requireAuth, requireTenant, requireRole('REGISTERED_MANAGER', 'DIRECTOR'), incidentReconstructionController.update.bind(incidentReconstructionController));
router.post('/:id/links', requireAuth, requireTenant, requireRole('REGISTERED_MANAGER', 'DIRECTOR'), incidentReconstructionController.linkPulses.bind(incidentReconstructionController));
router.get('/:id/timeline', requireAuth, requireTenant, incidentReconstructionController.getTimeline.bind(incidentReconstructionController));
router.post('/:id/complete', requireAuth, requireTenant, requireRole('REGISTERED_MANAGER', 'DIRECTOR'), incidentReconstructionController.complete.bind(incidentReconstructionController));

export default router;
