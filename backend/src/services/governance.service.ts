import { auditChecklistService } from './auditChecklist.service';

export class GovernanceService {
  async createPulse(company_id: string, data: any) {
    return auditChecklistService.createPulse(company_id, data);
  }

  async findAllPulses(company_id: string, filters: any, page = 1, limit = 50) {
    return auditChecklistService.findAllPulses(company_id, filters, page, limit);
  }

  async findPulseById(id: string, company_id: string) {
    return auditChecklistService.findPulseById(id, company_id);
  }

  async submitAnswers(pulse_id: string, company_id: string, user_id: string, answers: any[]) {
    return auditChecklistService.submitAnswers(pulse_id, company_id, user_id, answers);
  }

  async createTemplate(company_id: string, user_id: string, data: any) {
    return auditChecklistService.createTemplate(company_id, user_id, data);
  }

  async getTemplates(company_id: string) {
    return auditChecklistService.getTemplates(company_id);
  }

  async getTemplateQuestions(template_id: string, company_id: string) {
    return auditChecklistService.getTemplateQuestions(template_id, company_id);
  }

  async addTemplateQuestion(template_id: string, company_id: string, data: any) {
    return auditChecklistService.addTemplateQuestion(template_id, company_id, data);
  }

  async updateTemplateQuestion(question_id: string, template_id: string, company_id: string, data: any) {
    return auditChecklistService.updateTemplateQuestion(question_id, template_id, company_id, data);
  }

  async removeTemplateQuestion(question_id: string, template_id: string, company_id: string) {
    return auditChecklistService.removeTemplateQuestion(question_id, template_id, company_id);
  }

  async getPulseAnswers(pulse_id: string, company_id: string) {
    return auditChecklistService.getPulseAnswers(pulse_id, company_id);
  }

  async updatePulseStatus(pulse_id: string, company_id: string, status: string) {
    return auditChecklistService.updatePulseStatus(pulse_id, company_id, status);
  }

  async checkPulseCompliance(company_id: string) {
    return auditChecklistService.checkPulseCompliance(company_id);
  }

  async generateMissingPulses(company_id: string, house_id?: string, user_id?: string) {
    return auditChecklistService.generateMissingPulses(company_id, house_id, user_id);
  }
}

export const governanceService = new GovernanceService();
