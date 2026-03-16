"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.housesController = exports.HousesController = void 0;
const houses_service_1 = require("../services/houses.service");
class HousesController {
    async create(req, res) {
        try {
            const company_id = req.user.company_id;
            const house = await houses_service_1.housesService.create(company_id, req.body);
            return res.status(201).json({ success: true, data: house, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create house';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async findAll(req, res) {
        try {
            const company_id = req.user.company_id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const result = await houses_service_1.housesService.findAll(company_id, page, limit);
            return res.json({ success: true, data: result.houses, meta: { total: result.total, page, limit, pages: result.pages } });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch houses';
            return res.status(500).json({ success: false, message, errors: [] });
        }
    }
    async findById(req, res) {
        try {
            const company_id = req.user.company_id;
            const house = await houses_service_1.housesService.findById(req.params.id, company_id);
            return res.json({ success: true, data: house, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'House not found';
            return res.status(404).json({ success: false, message, errors: [] });
        }
    }
    async update(req, res) {
        try {
            const company_id = req.user.company_id;
            const house = await houses_service_1.housesService.update(req.params.id, company_id, req.body);
            return res.json({ success: true, data: house, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update house';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async delete(req, res) {
        try {
            const company_id = req.user.company_id;
            await houses_service_1.housesService.delete(req.params.id, company_id);
            return res.json({ success: true, data: { message: 'House closed' }, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete house';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async getStaff(req, res) {
        try {
            const company_id = req.user.company_id;
            const staff = await houses_service_1.housesService.getStaff(req.params.id, company_id);
            return res.json({ success: true, data: staff, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch house staff';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async assignStaff(req, res) {
        try {
            const company_id = req.user.company_id;
            const { user_id, role_in_house } = req.body;
            const result = await houses_service_1.housesService.assignStaff(req.params.id, company_id, user_id, role_in_house);
            return res.status(201).json({ success: true, data: result, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to assign staff';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async removeStaff(req, res) {
        try {
            const company_id = req.user.company_id;
            await houses_service_1.housesService.removeStaff(req.params.id, company_id, req.params.userId);
            return res.json({ success: true, data: { message: 'Staff removed' }, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to remove staff';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async getSettings(req, res) {
        try {
            const company_id = req.user.company_id;
            const settings = await houses_service_1.housesService.getSettings(req.params.id, company_id);
            return res.json({ success: true, data: settings, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch house settings';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async updateSettings(req, res) {
        try {
            const company_id = req.user.company_id;
            const settings = await houses_service_1.housesService.updateSettings(req.params.id, company_id, req.body);
            return res.json({ success: true, data: settings, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update house settings';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async getRisks(req, res) {
        try {
            const company_id = req.user.company_id;
            const risks = await houses_service_1.housesService.getRisks(req.params.id, company_id);
            return res.json({ success: true, data: risks, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch house risks';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async getIncidents(req, res) {
        try {
            const company_id = req.user.company_id;
            const incidents = await houses_service_1.housesService.getIncidents(req.params.id, company_id);
            return res.json({ success: true, data: incidents, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch house incidents';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async getGovernancePulses(req, res) {
        try {
            const company_id = req.user.company_id;
            const pulses = await houses_service_1.housesService.getGovernancePulses(req.params.id, company_id);
            return res.json({ success: true, data: pulses, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch house governance pulses';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async getMetricsOverview(req, res) {
        try {
            return res.json({ success: true, data: { active_houses: 0, total_capacity: 0 }, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch metrics overview';
            return res.status(500).json({ success: false, message, errors: [] });
        }
    }
    async getMapLocations(req, res) {
        try {
            return res.json({ success: true, data: [], meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch map locations';
            return res.status(500).json({ success: false, message, errors: [] });
        }
    }
}
exports.HousesController = HousesController;
exports.housesController = new HousesController();
//# sourceMappingURL=houses.controller.js.map