import { Router } from 'express';
import { notificationsController } from '../controllers/notifications.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/', requireAuth, notificationsController.findAll.bind(notificationsController));
router.patch('/read-all', requireAuth, notificationsController.markAllRead.bind(notificationsController));
router.patch('/:id/read', requireAuth, notificationsController.markRead.bind(notificationsController));
router.get('/preferences', requireAuth, notificationsController.getPreferences.bind(notificationsController));
router.put('/preferences', requireAuth, notificationsController.updatePreferences.bind(notificationsController));

export default router;
