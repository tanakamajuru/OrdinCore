import { Router } from 'express';
import { pulseController } from '../controllers/pulse.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

// C-01 — signal evidence is served ONLY through this authenticated, tenant- and site-scoped
// endpoint (never as a public static file). Replaces the previous unauthenticated static route.
const router = Router();

router.get('/:filename', requireAuth, requireTenant, pulseController.downloadMedia.bind(pulseController));

export default router;
