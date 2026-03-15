import { housesRepo } from '../repositories/houses.repo';

export class HousesService {
  async create(company_id: string, data: { name: string; address?: string; postcode?: string; city?: string; capacity?: number; manager_id?: string }) {
    return housesRepo.create({ company_id, ...data });
  }

  async findAll(company_id: string, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const [houses, total] = await Promise.all([
      housesRepo.findByCompany(company_id, limit, offset),
      housesRepo.countByCompany(company_id),
    ]);
    return { houses, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findById(id: string, company_id: string) {
    const house = await housesRepo.findById(id, company_id);
    if (!house) throw new Error('House not found');
    const users = await housesRepo.getUsers(id, company_id);
    return { ...house, users };
  }

  async update(id: string, company_id: string, data: object) {
    const house = await housesRepo.findById(id, company_id);
    if (!house) throw new Error('House not found');
    return housesRepo.update(id, company_id, data);
  }

  async delete(id: string, company_id: string) {
    const house = await housesRepo.findById(id, company_id);
    if (!house) throw new Error('House not found');
    await housesRepo.delete(id, company_id);
  }
}

export const housesService = new HousesService();
