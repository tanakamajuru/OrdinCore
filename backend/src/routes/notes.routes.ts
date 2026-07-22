import { Router } from 'express';
import { notesController } from '../controllers/notes.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

const READ = requireRole('SUPPORT_WORKER', 'TEAM_LEADER', 'REGISTERED_MANAGER', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL', 'ADMIN', 'SUPER_ADMIN');
const WRITE = requireRole('SUPPORT_WORKER', 'TEAM_LEADER', 'REGISTERED_MANAGER', 'ADMIN', 'SUPER_ADMIN');

/**
 * @openapi
 * /api/v1/notes:
 *   get:
 *     tags: [Notes]
 *     summary: List house shift/handover notes (optionally filtered by house_id)
 *   post:
 *     tags: [Notes]
 *     summary: Add a house note
 */
router.get('/', requireAuth, requireTenant, READ, notesController.list.bind(notesController));
router.post('/', requireAuth, requireTenant, WRITE, notesController.create.bind(notesController));

export default router;
