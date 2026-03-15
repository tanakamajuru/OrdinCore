import { Request, Response } from 'express';
import { companyService } from '../services/company.service';

export class CompanyController {
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
  async create(req: Request, res: Response) {
    try {
      const company = await companyService.create(req.body);
      return res.status(201).json({ success: true, data: company, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create company';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

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
  async findAll(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const result = await companyService.findAll(limit, (page - 1) * limit);
      return res.json({ success: true, data: result.companies, meta: { total: result.total, page, limit } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch companies';
      return res.status(500).json({ success: false, message, errors: [] });
    }
  }

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
  async findById(req: Request, res: Response) {
    try {
      const company = await companyService.findById(req.params.id);
      if (!company) return res.status(404).json({ success: false, message: 'Company not found', errors: [] });
      return res.json({ success: true, data: company, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch company';
      return res.status(500).json({ success: false, message, errors: [] });
    }
  }

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
  async update(req: Request, res: Response) {
    try {
      const company = await companyService.update(req.params.id, req.body);
      return res.json({ success: true, data: company, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update company';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

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
  async delete(req: Request, res: Response) {
    try {
      await companyService.delete(req.params.id);
      return res.json({ success: true, data: { message: 'Company deactivated' }, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete company';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }
}

export const companyController = new CompanyController();
