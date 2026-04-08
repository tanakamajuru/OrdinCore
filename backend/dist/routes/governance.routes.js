"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const governance_controller_1 = require("../controllers/governance.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const tenant_middleware_1 = require("../middleware/tenant.middleware");
const scope_middleware_1 = require("../middleware/scope.middleware");
const router = (0, express_1.Router)();
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
router.post('/templates', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, (0, role_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), governance_controller_1.governanceController.createTemplate.bind(governance_controller_1.governanceController));
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
router.get('/templates', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, governance_controller_1.governanceController.getTemplates.bind(governance_controller_1.governanceController));
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
router.get('/templates/:id/questions', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, governance_controller_1.governanceController.getTemplateQuestions.bind(governance_controller_1.governanceController));
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
router.post('/templates/:id/questions', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, (0, role_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), governance_controller_1.governanceController.addTemplateQuestion.bind(governance_controller_1.governanceController));
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
router.patch('/templates/:id/questions/:questionId', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, (0, role_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), governance_controller_1.governanceController.updateTemplateQuestion.bind(governance_controller_1.governanceController));
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
router.delete('/templates/:id/questions/:questionId', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, (0, role_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), governance_controller_1.governanceController.removeTemplateQuestion.bind(governance_controller_1.governanceController));
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
router.post('/pulse', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, scope_middleware_1.requireScope, (0, role_middleware_1.requireRole)('REGISTERED_MANAGER', 'TEAM_LEADER'), governance_controller_1.governanceController.createPulse.bind(governance_controller_1.governanceController));
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
router.get('/pulses', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, scope_middleware_1.requireScope, governance_controller_1.governanceController.getPulses.bind(governance_controller_1.governanceController));
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
router.get('/pulses/:id', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, scope_middleware_1.requireScope, governance_controller_1.governanceController.getPulseById.bind(governance_controller_1.governanceController));
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
router.post('/pulses/:id/submit', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, scope_middleware_1.requireScope, (0, role_middleware_1.requireRole)('REGISTERED_MANAGER', 'TEAM_LEADER'), governance_controller_1.governanceController.submitAnswers.bind(governance_controller_1.governanceController));
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
router.get('/pulses/:id/answers', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, governance_controller_1.governanceController.getPulseAnswers.bind(governance_controller_1.governanceController));
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
router.patch('/pulses/:id/status', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, (0, role_middleware_1.requireRole)('REGISTERED_MANAGER', 'TEAM_LEADER'), governance_controller_1.governanceController.updatePulseStatus.bind(governance_controller_1.governanceController));
exports.default = router;
//# sourceMappingURL=governance.routes.js.map