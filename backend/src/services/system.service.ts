import { systemRepo } from '../repositories/system.repo';

export class SystemService {
  async getSettings(group_name?: string) {
    return systemRepo.getSettings(group_name);
  }

  async updateSettings(updates: Array<{ key: string; value: string }>, updated_by: string) {
    const results = [];
    for (const update of updates) {
      const result = await systemRepo.updateSetting(update.key, update.value, updated_by);
      if (result) results.push(result);
    }
    return results;
  }

  async getAuditLogs(page = 1, limit = 50, filters = {}) {
    return systemRepo.getAuditLogs(page, limit, filters);
  }

  async getJobLogs(page = 1, limit = 50) {
    return systemRepo.getJobLogs(page, limit);
  }
}

export const systemService = new SystemService();
