"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyController = exports.CompanyController = void 0;
const company_service_1 = require("../services/company.service");
class CompanyController {
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
    async create(req, res) {
        try {
            const company = await company_service_1.companyService.create(req.body);
            return res.status(201).json({ success: true, data: company, meta: {} });
        }
        catch (err) {
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
    async findAll(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const result = await company_service_1.companyService.findAll(limit, (page - 1) * limit);
            return res.json({ success: true, data: result.companies, meta: { total: result.total, page, limit } });
        }
        catch (err) {
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
    async findById(req, res) {
        try {
            const company = await company_service_1.companyService.findById(req.params.id);
            if (!company)
                return res.status(404).json({ success: false, message: 'Company not found', errors: [] });
            return res.json({ success: true, data: company, meta: {} });
        }
        catch (err) {
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
    async update(req, res) {
        try {
            const company = await company_service_1.companyService.update(req.params.id, req.body);
            return res.json({ success: true, data: company, meta: {} });
        }
        catch (err) {
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
    async delete(req, res) {
        try {
            await company_service_1.companyService.delete(req.params.id);
            return res.json({ success: true, data: { message: 'Company deactivated' }, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete company';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
}
exports.CompanyController = CompanyController;
exports.companyController = new CompanyController();
//# sourceMappingURL=company.controller.js.map