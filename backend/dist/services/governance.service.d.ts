export declare class GovernanceService {
    createPulse(company_id: string, data: {
        house_id: string;
        template_id: string;
        due_date: Date;
    }): Promise<any>;
    findAllPulses(company_id: string, filters?: Record<string, unknown>, page?: number, limit?: number): Promise<{
        pulses: any[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    findPulseById(id: string, company_id: string): Promise<any>;
    submitAnswers(pulse_id: string, company_id: string, user_id: string, answers: Array<{
        question_id: string;
        answer: string;
        comment?: string;
        flagged?: boolean;
    }>): Promise<{
        message: string;
        compliance_score: number;
    }>;
    createTemplate(company_id: string, user_id: string, data: {
        name: string;
        description?: string;
        frequency?: string;
        questions: Array<{
            question: string;
            question_type: string;
            required?: boolean;
            options?: unknown[];
        }>;
    }): Promise<any>;
    getTemplates(company_id: string): Promise<any[]>;
    getTemplateQuestions(template_id: string, company_id: string): Promise<any[]>;
    addTemplateQuestion(template_id: string, company_id: string, data: {
        question: string;
        question_type: string;
        required?: boolean;
        options?: unknown[];
        order_index?: number;
    }): Promise<any>;
    updateTemplateQuestion(question_id: string, template_id: string, company_id: string, data: Record<string, unknown>): Promise<any>;
    removeTemplateQuestion(question_id: string, template_id: string, company_id: string): Promise<void>;
    getPulseAnswers(pulse_id: string, company_id: string): Promise<any[]>;
    updatePulseStatus(pulse_id: string, company_id: string, status: string): Promise<any>;
    checkPulseCompliance(company_id: string): Promise<any[]>;
    generateMissingPulses(company_id: string, house_id?: string, user_id?: string): Promise<void>;
}
export declare const governanceService: GovernanceService;
//# sourceMappingURL=governance.service.d.ts.map