import { Router } from 'express';
import { interventionsController } from '../controllers/interventions.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();
// The Intervention Panel is a management/oversight surface — RM manages service-level themes,
// Director/RI read cross-service and organisational trajectory. Not exposed to SW/TL.
const oversight = [requireAuth, requireTenant, requireRole('REGISTERED_MANAGER', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL', 'ADMIN', 'SUPER_ADMIN')];

router.get('/themes', ...oversight, interventionsController.themes);
router.post('/', ...oversight, interventionsController.upsert);

export default router;
