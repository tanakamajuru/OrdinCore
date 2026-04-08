export interface CreateUserDto {
    company_id?: string | null;
    email: string;
    password_hash: string;
    first_name: string;
    last_name: string;
    role: string;
    status?: string;
    pulse_days?: string[];
}
export declare const usersRepo: {
    findById(id: string, company_id?: string | null): Promise<any>;
    findByEmail(email: string): Promise<any>;
    findByCompany(company_id: string | null, limit?: number, offset?: number, role?: string, status?: string): Promise<any[]>;
    countByCompany(company_id: string, role?: string, status?: string): Promise<number>;
    create(dto: CreateUserDto): Promise<any>;
    update(id: string, data: Partial<CreateUserDto> & {
        last_login?: Date;
    }): Promise<any>;
    delete(id: string): Promise<void>;
    createProfile(user_id: string, data: {
        phone?: string;
        job_title?: string;
    }): Promise<any>;
    assignToHouse(user_id: string, house_id: string, company_id: string, role_in_house?: string): Promise<any>;
    clearAssignedHouses(user_id: string): Promise<void>;
    getHouses(user_id: string): Promise<any[]>;
    getPermissions(user_id: string): Promise<any[]>;
    getRoleDetails(user_id: string): Promise<any[]>;
    assignRole(user_id: string, role_name: string): Promise<any>;
    updateStatus(user_id: string, status: string): Promise<any>;
};
//# sourceMappingURL=users.repo.d.ts.map