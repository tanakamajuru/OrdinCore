import { Request, Response } from 'express';
export declare class CompanyController {
    /**
     * @swagger
     * /companies:
     *   post:
     *     tags: [Companies]
     *     summary: Create a new company (SUPER_ADMIN only)
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [name]
     *             properties:
     *               name: { type: string }
     *               domain: { type: string }
     *               plan: { type: string, enum: [starter, professional, enterprise] }
     *               email: { type: string }
     *               phone: { type: string }
     *               address: { type: string }
     *     responses:
     *       201: { description: Company created }
     */
    create(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * @swagger
     * /companies:
     *   get:
     *     tags: [Companies]
     *     summary: List all companies (SUPER_ADMIN only)
     *     parameters:
     *       - in: query
     *         name: page
     *         schema: { type: integer, default: 1 }
     *       - in: query
     *         name: limit
     *         schema: { type: integer, default: 50 }
     *     responses:
     *       200: { description: List of companies }
     */
    findAll(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * @swagger
     * /companies/{id}:
     *   get:
     *     tags: [Companies]
     *     summary: Get company by ID
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema: { type: string, format: uuid }
     *     responses:
     *       200: { description: Company details }
     *       404: { description: Company not found }
     */
    findById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * @swagger
     * /companies/{id}:
     *   patch:
     *     tags: [Companies]
     *     summary: Update a company
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema: { type: string, format: uuid }
     *     requestBody:
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Company'
     *     responses:
     *       200: { description: Company updated }
     */
    update(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * @swagger
     * /companies/{id}:
     *   delete:
     *     tags: [Companies]
     *     summary: Deactivate a company (SUPER_ADMIN only)
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema: { type: string, format: uuid }
     *     responses:
     *       200: { description: Company deactivated }
     */
    delete(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
export declare const companyController: CompanyController;
//# sourceMappingURL=company.controller.d.ts.map