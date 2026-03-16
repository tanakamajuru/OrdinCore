export declare class NotificationsService {
    create(data: {
        company_id: string;
        user_id: string;
        type: string;
        title: string;
        body: string;
        link?: string;
        metadata?: Record<string, unknown>;
    }): Promise<any>;
    findAll(user_id: string, company_id: string, page?: number, limit?: number): Promise<{
        notifications: any[];
        total: number;
        unread_count: number;
        page: number;
        limit: number;
    }>;
    markRead(id: string, user_id: string): Promise<void>;
    markAllRead(user_id: string, company_id: string): Promise<{
        updated: number | null;
    }>;
    getPreferences(user_id: string): Promise<any>;
    updatePreferences(user_id: string, company_id: string, prefs: object): Promise<void>;
}
export declare const notificationsService: NotificationsService;
//# sourceMappingURL=notifications.service.d.ts.map