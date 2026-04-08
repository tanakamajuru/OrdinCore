export interface CreateIncidentDto {
    company_id: string;
    house_id: string;
    category_id?: string;
    title: string;
    description: string;
    severity?: string;
    status?: string;
    occurred_at: Date;
    location?: string;
    immediate_action?: string;
    created_by: string;
    assigned_to?: string;
}
export declare const incidentsRepo: {
    findById(id: string, company_id?: string): Promise<any>;
    findByCompany(company_id: string, filters?: Record<string, unknown>, limit?: number, offset?: number): Promise<any[]>;
    countByCompany(company_id: string, filters?: Record<string, unknown>): Promise<number>;
    create(dto: CreateIncidentDto & {
        persons_involved?: string[];
        follow_up_required?: boolean;
    }): Promise<any>;
    update(id: string, company_id: string, data: Partial<CreateIncidentDto> & {
        status?: string;
        resolved_at?: Date;
    }): Promise<any>;
    getTimeline(incident_id: string, company_id: string): Promise<any[]>;
    getCategories(company_id: string): Promise<any[]>;
    createCategory(company_id: string, data: {
        name: string;
        description?: string;
        severity_level?: string;
        created_by: string;
    }): Promise<any>;
    getAttachments(incident_id: string, company_id: string): Promise<any[]>;
    addAttachment(incident_id: string, company_id: string, data: {
        file_name: string;
        file_url: string;
        file_type?: string;
        file_size?: number;
        uploaded_by: string;
    }): Promise<any>;
    removeAttachment(attachment_id: string, incident_id: string, company_id: string): Promise<void>;
    assignIncident(incident_id: string, company_id: string, assigned_to: string): Promise<any>;
    resolveIncident(incident_id: string, company_id: string, resolution_notes: string): Promise<any>;
    delete(id: string, company_id: string): Promise<void>;
    addEvent(incident_id: string, company_id: string, data: {
        event_type: string;
        title: string;
        description?: string;
        metadata?: Record<string, unknown>;
        created_by: string;
    }): Promise<any>;
    getGovernanceTimeline(incident_id: string, company_id: string): Promise<{
        timeline: never[];
        metrics: {};
        patterns: never[];
        findings: never[];
        recommendations: never[];
    } | {
        timeline: {
            id: string;
            timestamp: any;
            sourceType: any;
            sourceId: any;
            label: any;
            detail: any;
            actor: any;
            actorRole: any;
            gapFlag: any;
        }[];
        metrics: {
            riskSignalsLogged: number;
            escalationsTriggered: number;
            leadershipReviews: number;
            lastOversightReviewDays: number;
            firstSignalToIncidentDays: number;
            escalationResponseHours: number;
        };
        patterns: {
            house: string;
            signal: string;
            detected: string;
        }[];
        findings: string[];
        recommendations: string[];
    }>;
};
//# sourceMappingURL=incidents.repo.d.ts.map