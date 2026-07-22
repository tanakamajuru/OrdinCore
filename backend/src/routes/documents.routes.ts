import { Router } from 'express';
import { documentsController } from '../controllers/documents.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

const READ = requireRole('SUPPORT_WORKER', 'TEAM_LEADER', 'REGISTERED_MANAGER', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL', 'ADMIN', 'SUPER_ADMIN');
const WRITE = requireRole('REGISTERED_MANAGER', 'ADMIN', 'SUPER_ADMIN');

/**
 * @openapi
 * /api/v1/documents:
 *   get:
 *     tags: [Documents]
 *     summary: List governance documents (filter by house_id / category)
 *   post:
 *     tags: [Documents]
 *     summary: Add a governance document (managers only)
 */
router.get('/', requireAuth, requireTenant, READ, documentsController.list.bind(documentsController));
router.post('/', requireAuth, requireTenant, WRITE, documentsController.create.bind(documentsController));

export default router;
