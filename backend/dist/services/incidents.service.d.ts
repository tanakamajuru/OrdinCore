export declare class IncidentsService {
    create(company_id: string, created_by: string, data: {
        house_id: string;
        title: string;
        description: string;
        severity?: string;
        occurred_at: Date;
        location?: string;
        immediate_action?: string;
        category_id?: string;
        assigned_to?: string;
        persons_involved?: string[];
        follow_up_required?: boolean;
    }): Promise<any>;
    findAll(company_id: string, filters?: Record<string, unknown>, page?: number, limit?: number): Promise<{
        incidents: any[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    findById(id: string, company_id: string): Promise<any>;
    update(id: string, company_id: string, data: Record<string, unknown>): Promise<any>;
    delete(id: string, company_id: string): Promise<void>;
    getTimeline(incident_id: string, company_id: string): Promise<any[]>;
    getGovernanceTimeline(incident_id: string, company_id: string): Promise<{
        id: string;
        timestamp: any;
        sourceType: any;
        sourceId: any;
        label: any;
        detail: any;
        actor: any;
        actorRole: any;
        gapFlag: any;
        intervalToNext: number;
    }[]>;
    getCategories(company_id: string): Promise<any[]>;
    createCategory(company_id: string, user_id: string, data: {
        name: string;
        description?: string;
        severity_level?: string;
    }): Promise<any>;
    getAttachments(incident_id: string, company_id: string): Promise<any[]>;
    addAttachment(incident_id: string, company_id: string, user_id: string, data: {
        file_name: string;
        file_url: string;
        file_type?: string;
        file_size?: number;
    }): Promise<any>;
    removeAttachment(incident_id: string, company_id: string, user_id: string, attachment_id: string): Promise<void>;
    assignIncident(incident_id: string, company_id: string, user_id: string, assigned_to: string): Promise<any>;
    resolveIncident(incident_id: string, company_id: string, user_id: string, resolution_notes: string): Promise<any>;
}
export declare const incidentsService: IncidentsService;
//# sourceMappingURL=incidents.service.d.ts.map