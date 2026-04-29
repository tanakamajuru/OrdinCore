import { Router } from 'express';
import { governanceController } from '../controllers/governance.controller';
import { pulseController } from '../controllers/pulse.controller';
import { dailyGovernanceController } from '../controllers/dailyGovernance.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireScope } from '../middleware/scope.middleware';

const router = Router();

// Templates
/**
 * @openapi
 * /api/v1/governance/templates:
 *   post:
 *     tags:
 *       - Governance
 *     summary: POST /api/v1/governance/templates
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/templates', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), governanceController.createTemplate.bind(governanceController));
/**
 * @openapi
 * /api/v1/governance/templates:
 *   get:
 *     tags:
 *       - Governance
 *     summary: GET /api/v1/governance/templates
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/templates', requireAuth, requireTenant, governanceController.getTemplates.bind(governanceController));

// Template Questions
/**
 * @openapi
 * /api/v1/governance/templates/{id}/questions:
 *   get:
 *     tags:
 *       - Governance
 *     summary: GET /api/v1/governance/templates/{id}/questions
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/templates/:id/questions', requireAuth, requireTenant, governanceController.getTemplateQuestions.bind(governanceController));
/**
 * @openapi
 * /api/v1/governance/templates/{id}/questions:
 *   post:
 *     tags:
 *       - Governance
 *     summary: POST /api/v1/governance/templates/{id}/questions
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/templates/:id/questions', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), governanceController.addTemplateQuestion.bind(governanceController));
/**
 * @openapi
 * /api/v1/governance/templates/{id}/questions/{questionId}:
 *   patch:
 *     tags:
 *       - Governance
 *     summary: PATCH /api/v1/governance/templates/{id}/questions/{questionId}
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.patch('/templates/:id/questions/:questionId', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), governanceController.updateTemplateQuestion.bind(governanceController));
/**
 * @openapi
 * /api/v1/governance/templates/{id}/questions/{questionId}:
 *   delete:
 *     tags:
 *       - Governance
 *     summary: DELETE /api/v1/governance/templates/{id}/questions/{questionId}
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.delete('/templates/:id/questions/:questionId', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), governanceController.removeTemplateQuestion.bind(governanceController));

// Pulses
/**
 * @openapi
 * /api/v1/governance/pulse:
 *   post:
 *     tags:
 *       - Governance
 *     summary: POST /api/v1/governance/pulse
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/pulse', requireAuth, requireTenant, requireScope, requireRole('REGISTERED_MANAGER', 'TEAM_LEADER'), governanceController.createPulse.bind(governanceController));
/**
 * @openapi
 * /api/v1/governance/pulses:
 *   get:
 *     tags:
 *       - Governance
 *     summary: GET /api/v1/governance/pulses
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/pulses', requireAuth, requireTenant, requireScope, governanceController.getPulses.bind(governanceController));
/**
 * @openapi
 * /api/v1/governance/pulses/{id}:
 *   get:
 *     tags:
 *       - Governance
 *     summary: GET /api/v1/governance/pulses/{id}
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/pulses/:id', requireAuth, requireTenant, requireScope, governanceController.getPulseById.bind(governanceController));
/**
 * @openapi
 * /api/v1/governance/pulses/{id}/submit:
 *   post:
 *     tags:
 *       - Governance
 *     summary: POST /api/v1/governance/pulses/{id}/submit
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/pulses/:id/submit', requireAuth, requireTenant, requireScope, requireRole('REGISTERED_MANAGER', 'TEAM_LEADER'), governanceController.submitAnswers.bind(governanceController));
/**
 * @openapi
 * /api/v1/governance/pulses/{id}/answers:
 *   get:
 *     tags:
 *       - Governance
 *     summary: GET /api/v1/governance/pulses/{id}/answers
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/pulses/:id/answers', requireAuth, requireTenant, governanceController.getPulseAnswers.bind(governanceController));
/**
 * @openapi
 * /api/v1/governance/pulses/{id}/status:
 *   patch:
 *     tags:
 *       - Governance
 *     summary: PATCH /api/v1/governance/pulses/{id}/status
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.patch('/pulses/:id/status', requireAuth, requireTenant, requireRole('REGISTERED_MANAGER', 'TEAM_LEADER'), governanceController.updatePulseStatus.bind(governanceController));

// Clusters & Candidates
router.get('/clusters', requireAuth, requireTenant, requireScope, governanceController.getClusters.bind(governanceController));
router.get('/risk-candidates', requireAuth, requireTenant, requireScope, governanceController.getRiskCandidates.bind(governanceController));

// Action Effectiveness
router.get('/action-effectiveness', requireAuth, requireTenant, requireScope, governanceController.getActionEffectiveness.bind(governanceController));

// Daily Governance Log
router.post('/daily-log/open', requireAuth, requireTenant, requireScope, dailyGovernanceController.openLog.bind(dailyGovernanceController));
router.post('/daily-log/:id/complete', requireAuth, requireTenant, requireScope, dailyGovernanceController.completeLog.bind(dailyGovernanceController));

export default router;
