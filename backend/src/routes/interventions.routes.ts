import { Router } from 'express';
import { interventionsController } from '../controllers/interventions.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();
// The Intervention Panel is a management/oversight surface — RM manages service-level themes,
// Director/RI read cross-service and organisational trajectory. Not exposed to SW/TL.
const oversight = [requireAuth, requireTenant, requireRole('REGISTERED_MANAGER', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL', 'ADMIN', 'SUPER_ADMIN')];
// Frozen doctrine: the RM owns the operational intervention decision. Director and RI consume
// the same record as assurance readers; their challenge/queries are append-only oversight events.
const operationalWrite = [requireAuth, requireTenant, requireRole('REGISTERED_MANAGER')];

router.get('/themes', ...oversight, interventionsController.themes);
router.get('/governance-health', ...oversight, interventionsController.governanceHealth);
router.post('/', ...operationalWrite, interventionsController.upsert);

export default router;
