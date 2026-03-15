import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', authController.login.bind(authController));
router.post('/logout', requireAuth, authController.logout.bind(authController));
router.post('/refresh', authController.refresh.bind(authController));
router.get('/me', requireAuth, authController.me.bind(authController));
router.post('/change-password', requireAuth, authController.changePassword.bind(authController));

export default router;
