import { Router } from 'express';
import { directorInsightsController } from '../controllers/directorInsights.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireRole } from '../middleware/role.middleware';

const OVERSIGHT = ['REGISTERED_MANAGER', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL', 'ADMIN', 'SUPER_ADMIN'] as const;

// Mounted at /api/v1/director
export const directorInsightsRouter = Router();
directorInsightsRouter.get('/cross-site-heatmap', requireAuth, requireTenant, requireRole(...OVERSIGHT), directorInsightsController.crossSiteHeatmap.bind(directorInsightsController));
directorInsightsRouter.get('/effectiveness-by-service', requireAuth, requireTenant, requireRole(...OVERSIGHT), directorInsightsController.effectivenessByService.bind(directorInsightsController));

// Mounted at /api/v1/ri
export const riInsightsRouter = Router();
riInsightsRouter.get('/assurance-summary', requireAuth, requireTenant, requireRole('DIRECTOR', 'RESPONSIBLE_INDIVIDUAL', 'ADMIN', 'SUPER_ADMIN'), directorInsightsController.riAssuranceSummary.bind(directorInsightsController));
