export declare class RisksService {
    create(company_id: string, created_by: string, data: {
        house_id: string;
        title: string;
        description?: string;
        severity?: string;
        category_id?: string;
        likelihood?: number;
        impact?: number;
        assigned_to?: string;
        review_due_date?: Date;
        metadata?: any;
    }): Promise<any>;
    findAll(company_id: string, filters?: Record<string, unknown>, page?: number, limit?: number): Promise<{
        risks: any[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    findById(id: string, company_id: string): Promise<any>;
    update(id: string, company_id: string, user_id: string, data: Record<string, unknown>): Promise<any>;
    delete(id: string, company_id: string, user_id: string): Promise<void>;
    addEvent(risk_id: string, company_id: string, user_id: string, data: {
        event_type: string;
        description: string;
    }): Promise<any>;
    addAction(risk_id: string, company_id: string, user_id: string, data: {
        title: string;
        description?: string;
        assigned_to?: string;
        due_date?: Date;
    }): Promise<any>;
    getActions(risk_id: string, company_id: string): Promise<any[]>;
    escalate(risk_id: string, company_id: string, escalated_by: string, data: {
        escalated_to: string;
        reason: string;
    }): Promise<{
        escalation_id: string;
        message: string;
    }>;
    getTimeline(risk_id: string, company_id: string): Promise<any[]>;
    getCategories(company_id: string): Promise<any[]>;
    createCategory(company_id: string, user_id: string, data: {
        name: string;
        description?: string;
        color?: string;
    }): Promise<any>;
    getAttachments(risk_id: string, company_id: string): Promise<any[]>;
    addAttachment(risk_id: string, company_id: string, user_id: string, data: {
        file_name: string;
        file_url: string;
        file_type?: string;
        file_size?: number;
    }): Promise<any>;
    removeAttachment(risk_id: string, company_id: string, user_id: string, attachment_id: string): Promise<void>;
    assignRisk(risk_id: string, company_id: string, user_id: string, assigned_to: string): Promise<any>;
    getAssignedToMe(company_id: string, user_id: string, page?: number, limit?: number): Promise<{
        risks: any[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    updateStatus(risk_id: string, company_id: string, user_id: string, status: string): Promise<any>;
    private checkAutoEscalation;
}
export declare const risksService: RisksService;
//# sourceMappingURL=risks.service.d.ts.map