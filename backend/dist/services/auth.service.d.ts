export declare class AuthService {
    login(email: string, password: string): Promise<{
        token: string;
        refreshToken: string;
        user: any;
    }>;
    me(userId: string): Promise<any>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{
        message: string;
    }>;
    refreshToken(token: string): Promise<{
        token: string;
    }>;
    generateToken(user: {
        id: string;
        company_id: string | null;
        role: string;
        email: string;
    }): string;
    generateRefreshToken(user: {
        id: string;
    }): string;
    logAudit(company_id: string | null, user_id: string, action: string, resource: string, resource_id?: string): Promise<void>;
}
export declare const authService: AuthService;
//# sourceMappingURL=auth.service.d.ts.map