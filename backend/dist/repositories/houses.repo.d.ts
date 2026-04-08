export interface CreateHouseDto {
    company_id: string;
    name: string;
    address?: string;
    postcode?: string;
    city?: string;
    capacity?: number;
    manager_id?: string;
    registration_number?: string;
}
export declare const housesRepo: {
    findById(id: string, company_id?: string): Promise<any>;
    findByCompany(company_id: string, filters?: Record<string, unknown>, limit?: number, offset?: number): Promise<any[]>;
    countByCompany(company_id: string, filters?: Record<string, unknown>): Promise<number>;
    create(dto: CreateHouseDto): Promise<any>;
    update(id: string, company_id: string, data: Partial<CreateHouseDto>): Promise<any>;
    delete(id: string, company_id: string): Promise<void>;
    getUsers(house_id: string, company_id: string): Promise<any[]>;
    assignStaff(house_id: string, company_id: string, user_id: string, role_in_house?: string): Promise<any>;
    removeStaff(house_id: string, company_id: string, user_id: string): Promise<void>;
    getSettings(house_id: string, company_id: string): Promise<any>;
    updateSettings(house_id: string, company_id: string, settings: any): Promise<any>;
};
//# sourceMappingURL=houses.repo.d.ts.map