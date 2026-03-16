"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemService = exports.SystemService = void 0;
const system_repo_1 = require("../repositories/system.repo");
class SystemService {
    async getSettings(group_name) {
        return system_repo_1.systemRepo.getSettings(group_name);
    }
    async updateSettings(updates, updated_by) {
        const results = [];
        for (const update of updates) {
            const result = await system_repo_1.systemRepo.updateSetting(update.key, update.value, updated_by);
            if (result)
                results.push(result);
        }
        return results;
    }
    async getAuditLogs(page = 1, limit = 50, filters = {}) {
        return system_repo_1.systemRepo.getAuditLogs(page, limit, filters);
    }
    async getJobLogs(page = 1, limit = 50) {
        return system_repo_1.systemRepo.getJobLogs(page, limit);
    }
}
exports.SystemService = SystemService;
exports.systemService = new SystemService();
//# sourceMappingURL=system.service.js.map