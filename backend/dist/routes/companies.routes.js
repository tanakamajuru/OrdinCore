"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const company_controller_1 = require("../controllers/company.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const router = (0, express_1.Router)();
// All company routes require SUPER_ADMIN
/**
 * @openapi
 * /api/v1/companies:
 *   post:
 *     tags:
 *       - Companies
 *     summary: POST /api/v1/companies
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/', auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)('SUPER_ADMIN'), company_controller_1.companyController.create.bind(company_controller_1.companyController));
/**
 * @openapi
 * /api/v1/companies:
 *   get:
 *     tags:
 *       - Companies
 *     summary: GET /api/v1/companies
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/', auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)('SUPER_ADMIN'), company_controller_1.companyController.findAll.bind(company_controller_1.companyController));
/**
 * @openapi
 * /api/v1/companies/{id}:
 *   get:
 *     tags:
 *       - Companies
 *     summary: GET /api/v1/companies/{id}
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
router.get('/:id', auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)('SUPER_ADMIN'), company_controller_1.companyController.findById.bind(company_controller_1.companyController));
/**
 * @openapi
 * /api/v1/companies/{id}:
 *   patch:
 *     tags:
 *       - Companies
 *     summary: PATCH /api/v1/companies/{id}
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
router.patch('/:id', auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)('SUPER_ADMIN'), company_controller_1.companyController.update.bind(company_controller_1.companyController));
/**
 * @openapi
 * /api/v1/companies/{id}:
 *   delete:
 *     tags:
 *       - Companies
 *     summary: DELETE /api/v1/companies/{id}
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
router.delete('/:id', auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)('SUPER_ADMIN'), company_controller_1.companyController.delete.bind(company_controller_1.companyController));
exports.default = router;
//# sourceMappingURL=companies.routes.js.map