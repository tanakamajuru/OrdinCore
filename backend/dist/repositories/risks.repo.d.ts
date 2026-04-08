export interface CreateRiskDto {
    company_id: string;
    house_id: string;
    category_id?: string;
    title: string;
    description?: string;
    severity?: string;
    likelihood?: number;
    impact?: number;
    assigned_to?: string;
    created_by: string;
    review_due_date?: Date;
    status?: string;
    metadata?: any;
}
export declare const risksRepo: {
    findById(id: string, company_id?: string): Promise<any>;
    findByCompany(company_id: string, filters?: Record<string, unknown>, limit?: number, offset?: number): Promise<any[]>;
    countByCompany(company_id: string, filters?: Record<string, unknown>): Promise<number>;
    create(dto: CreateRiskDto): Promise<any>;
    update(id: string, company_id: string, data: Partial<CreateRiskDto> & {
        status?: string;
        resolved_at?: Date;
    }): Promise<any>;
    delete(id: string, company_id: string): Promise<void>;
    addEvent(risk_id: string, company_id: string, event_type: string, description: string, created_by: string): Promise<any>;
    addAction(risk_id: string, company_id: string, data: {
        title: string;
        description?: string;
        assigned_to?: string;
        due_date?: Date;
        created_by: string;
    }): Promise<any>;
    getActions(risk_id: string, company_id: string): Promise<any[]>;
    getTimeline(risk_id: string, company_id: string): Promise<any[]>;
    getCategories(company_id: string): Promise<any[]>;
    createCategory(company_id: string, data: {
        name: string;
        description?: string;
        color?: string;
        created_by: string;
    }): Promise<any>;
    getAttachments(risk_id: string, company_id: string): Promise<any[]>;
    addAttachment(risk_id: string, company_id: string, data: {
        file_name: string;
        file_url: string;
        file_type?: string;
        file_size?: number;
        uploaded_by: string;
    }): Promise<any>;
    removeAttachment(attachment_id: string, risk_id: string, company_id: string): Promise<void>;
    assignRisk(risk_id: string, company_id: string, assigned_to: string): Promise<any>;
    updateStatus(risk_id: string, company_id: string, status: string): Promise<any>;
};
//# sourceMappingURL=risks.repo.d.ts.map