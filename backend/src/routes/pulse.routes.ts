import { Router } from 'express';
import { pulseController } from '../controllers/pulse.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

/**
 * @openapi
 * /api/v1/pulses:
 *   post:
 *     tags: [Pulses]
 *     summary: Submit a new signal capture (Daily Pulse)
 *     security: [{ BearerAuth: [] }]
 */
router.post('/', requireAuth, requireTenant, requireRole('TEAM_LEADER', 'REGISTERED_MANAGER'), pulseController.createPulse.bind(pulseController));

/**
 * @openapi
 * /api/v1/pulses:
 *   get:
 *     tags: [Pulses]
 *     summary: List signals
 */
router.get('/', requireAuth, requireTenant, requireRole('TEAM_LEADER', 'REGISTERED_MANAGER', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL', 'ADMIN', 'SUPER_ADMIN'), pulseController.getPulses.bind(pulseController));

/**
 * @openapi
 * /api/v1/pulses/dashboard:
 *   get:
 *     tags: [Pulses]
 *     summary: Get Daily Oversight Board feed
 */
router.get('/dashboard', requireAuth, requireTenant, requireRole('REGISTERED_MANAGER'), pulseController.getDashboardFeed.bind(pulseController));

/**
 * @openapi
 * /api/v1/pulses/{id}:
 *   get:
 *     tags: [Pulses]
 *     summary: Get single pulse detail
 */
router.get('/:id', requireAuth, requireTenant, requireRole('TEAM_LEADER', 'REGISTERED_MANAGER', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL', 'ADMIN', 'SUPER_ADMIN'), pulseController.getPulseById.bind(pulseController));

/**
 * @openapi
 * /api/v1/pulses/{id}/review:
 *   patch:
 *     tags: [Pulses]
 *     summary: RM triage of a signal
 */
router.patch('/:id/review', requireAuth, requireTenant, requireRole('REGISTERED_MANAGER'), pulseController.reviewPulse.bind(pulseController));
router.patch('/:id/status', requireAuth, requireTenant, requireRole('REGISTERED_MANAGER'), pulseController.reviewPulse.bind(pulseController));

/**
 * @openapi
 * /api/v1/pulses/{id}/link-risk:
 *   post:
 *     tags: [Pulses]
 *     summary: Link pulse to an existing risk
 */
router.post('/:id/link-risk', requireAuth, requireTenant, requireRole('REGISTERED_MANAGER'), pulseController.linkToRisk.bind(pulseController));

/**
 * @openapi
 * /api/v1/pulses/{id}/assignee:
 *   patch:
 *     tags: [Pulses]
 *     summary: Reassign a signal to a different Team Leader
 */
router.patch('/:id/assignee', requireAuth, requireTenant, requireRole('TEAM_LEADER', 'REGISTERED_MANAGER', 'ADMIN', 'SUPER_ADMIN'), pulseController.reassignSignal.bind(pulseController));
// Edit the observation note — appended as a new attributed version (TL who logged it, or RM/admin).
router.patch('/:id/note', requireAuth, requireTenant, requireRole('TEAM_LEADER', 'REGISTERED_MANAGER', 'ADMIN', 'SUPER_ADMIN', 'DIRECTOR'), pulseController.updateNote.bind(pulseController));

// Alias for singular /pulse to reuse existing /pulses logic
router.get('/pulse', requireAuth, requireTenant, pulseController.getPulses.bind(pulseController));

export default router;
