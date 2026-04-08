"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.housesService = exports.HousesService = void 0;
const houses_repo_1 = require("../repositories/houses.repo");
class HousesService {
    async create(company_id, data) {
        return houses_repo_1.housesRepo.create({ company_id, ...data });
    }
    async findAll(company_id, filters = {}, page = 1, limit = 50) {
        const offset = (page - 1) * limit;
        const [houses, total] = await Promise.all([
            houses_repo_1.housesRepo.findByCompany(company_id, filters, limit, offset),
            houses_repo_1.housesRepo.countByCompany(company_id, filters),
        ]);
        return { houses, total, page, limit, pages: Math.ceil(total / limit) };
    }
    async findById(id, company_id) {
        const house = await houses_repo_1.housesRepo.findById(id, company_id);
        if (!house)
            throw new Error('House not found');
        const users = await houses_repo_1.housesRepo.getUsers(id, company_id);
        return { ...house, users };
    }
    async update(id, company_id, data) {
        const house = await houses_repo_1.housesRepo.findById(id, company_id);
        if (!house)
            throw new Error('House not found');
        return houses_repo_1.housesRepo.update(id, company_id, data);
    }
    async delete(id, company_id) {
        const house = await houses_repo_1.housesRepo.findById(id, company_id);
        if (!house)
            throw new Error('House not found');
        await houses_repo_1.housesRepo.delete(id, company_id);
    }
    async getStaff(id, company_id) {
        const house = await houses_repo_1.housesRepo.findById(id, company_id);
        if (!house)
            throw new Error('House not found');
        return houses_repo_1.housesRepo.getUsers(id, company_id);
    }
    async assignStaff(id, company_id, user_id, role_in_house) {
        const house = await houses_repo_1.housesRepo.findById(id, company_id);
        if (!house)
            throw new Error('House not found');
        return houses_repo_1.housesRepo.assignStaff(id, company_id, user_id, role_in_house);
    }
    async removeStaff(id, company_id, user_id) {
        const house = await houses_repo_1.housesRepo.findById(id, company_id);
        if (!house)
            throw new Error('House not found');
        await houses_repo_1.housesRepo.removeStaff(id, company_id, user_id);
    }
    async getSettings(id, company_id) {
        const house = await houses_repo_1.housesRepo.findById(id, company_id);
        if (!house)
            throw new Error('House not found');
        return houses_repo_1.housesRepo.getSettings(id, company_id);
    }
    async updateSettings(id, company_id, settings) {
        const house = await houses_repo_1.housesRepo.findById(id, company_id);
        if (!house)
            throw new Error('House not found');
        return houses_repo_1.housesRepo.updateSettings(id, company_id, settings);
    }
    async getRisks(id, company_id) {
        const house = await houses_repo_1.housesRepo.findById(id, company_id);
        if (!house)
            throw new Error('House not found');
        const { query } = await Promise.resolve().then(() => __importStar(require('../config/database')));
        const result = await query(`SELECT * FROM risks WHERE house_id = $1 AND company_id = $2`, [id, company_id]);
        return result.rows;
    }
    async getIncidents(id, company_id) {
        const house = await houses_repo_1.housesRepo.findById(id, company_id);
        if (!house)
            throw new Error('House not found');
        const { query } = await Promise.resolve().then(() => __importStar(require('../config/database')));
        const result = await query(`SELECT * FROM incidents WHERE house_id = $1 AND company_id = $2`, [id, company_id]);
        return result.rows;
    }
    async getGovernancePulses(id, company_id) {
        const house = await houses_repo_1.housesRepo.findById(id, company_id);
        if (!house)
            throw new Error('House not found');
        const { query } = await Promise.resolve().then(() => __importStar(require('../config/database')));
        const result = await query(`SELECT * FROM governance_pulses WHERE house_id = $1 AND company_id = $2`, [id, company_id]);
        return result.rows;
    }
}
exports.HousesService = HousesService;
exports.housesService = new HousesService();
//# sourceMappingURL=houses.service.js.map