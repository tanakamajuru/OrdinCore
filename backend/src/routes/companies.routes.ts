import { Router } from 'express';
import { companyController } from '../controllers/company.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

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
router.post('/', requireAuth, requireRole('SUPER_ADMIN'), companyController.create.bind(companyController));
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
router.get('/', requireAuth, requireRole('SUPER_ADMIN'), companyController.findAll.bind(companyController));
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
router.get('/:id', requireAuth, requireRole('SUPER_ADMIN'), companyController.findById.bind(companyController));
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
router.patch('/:id', requireAuth, requireRole('SUPER_ADMIN'), companyController.update.bind(companyController));
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
router.delete('/:id', requireAuth, requireRole('SUPER_ADMIN'), companyController.delete.bind(companyController));

export default router;
