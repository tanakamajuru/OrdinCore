import { Router } from 'express';
import { thresholdEventsController } from '../controllers/thresholdEvents.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.get('/', requireAuth, requireTenant, thresholdEventsController.findAll.bind(thresholdEventsController));

export default router;
