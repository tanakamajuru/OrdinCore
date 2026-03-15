import bcrypt from 'bcryptjs';
import { usersRepo } from '../repositories/users.repo';

export class UsersService {
  async create(company_id: string, data: {
    email: string; password: string; first_name: string; last_name: string; role: string; phone?: string; job_title?: string;
  }) {
    const existing = await usersRepo.findByEmail(data.email);
    if (existing) throw new Error('Email already in use');

    const password_hash = await bcrypt.hash(data.password, 12);
    const user = await usersRepo.create({ company_id, email: data.email, password_hash, first_name: data.first_name, last_name: data.last_name, role: data.role });
    await usersRepo.createProfile(user.id, { phone: data.phone, job_title: data.job_title });

    const { password_hash: _, ...safeUser } = user;
    void _;
    return safeUser;
  }

  async findAll(company_id: string, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const [users, total] = await Promise.all([
      usersRepo.findByCompany(company_id, limit, offset),
      usersRepo.countByCompany(company_id),
    ]);
    return { users: users.map(({ password_hash, ...u }) => { void password_hash; return u; }), total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findById(id: string, company_id: string) {
    const user = await usersRepo.findById(id);
    if (!user || user.company_id !== company_id) throw new Error('User not found');
    const { password_hash, ...safe } = user;
    void password_hash;
    return safe;
  }

  async update(id: string, company_id: string, data: Partial<{ first_name: string; last_name: string; role: string; status: string }>) {
    const user = await usersRepo.findById(id);
    if (!user || user.company_id !== company_id) throw new Error('User not found');
    const updated = await usersRepo.update(id, data);
    const { password_hash, ...safe } = updated;
    void password_hash;
    return safe;
  }

  async delete(id: string, company_id: string) {
    const user = await usersRepo.findById(id);
    if (!user || user.company_id !== company_id) throw new Error('User not found');
    await usersRepo.delete(id);
  }

  async assignToHouse(userId: string, houseId: string, company_id: string, roleInHouse?: string) {
    return usersRepo.assignToHouse(userId, houseId, company_id, roleInHouse);
  }

  async getHouses(userId: string, company_id: string) {
    const user = await usersRepo.findById(userId);
    if (!user || user.company_id !== company_id) throw new Error('User not found');
    return usersRepo.getHouses(userId);
  }

  async getPermissions(userId: string, company_id: string) {
    const user = await usersRepo.findById(userId);
    if (!user || user.company_id !== company_id) throw new Error('User not found');
    return usersRepo.getPermissions(userId);
  }

  async getRoles(userId: string, company_id: string) {
    const user = await usersRepo.findById(userId);
    if (!user || user.company_id !== company_id) throw new Error('User not found');
    return usersRepo.getRoleDetails(userId);
  }

  async assignRole(userId: string, company_id: string, roleName: string) {
    const user = await usersRepo.findById(userId);
    if (!user || user.company_id !== company_id) throw new Error('User not found');
    return usersRepo.assignRole(userId, roleName);
  }

  async suspend(userId: string, company_id: string) {
    const user = await usersRepo.findById(userId);
    if (!user || user.company_id !== company_id) throw new Error('User not found');
    return usersRepo.updateStatus(userId, 'suspended');
  }

  async activate(userId: string, company_id: string) {
    const user = await usersRepo.findById(userId);
    if (!user || user.company_id !== company_id) throw new Error('User not found');
    return usersRepo.updateStatus(userId, 'active');
  }

  async search(company_id: string, queryStr: string, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    // Basic search filtering implemented in service level for simplicity on top of existing findByCompany
    const [users, total] = await Promise.all([
      usersRepo.findByCompany(company_id, 1000, 0), // fetch all and sort in memory (or add search to repo)
      usersRepo.countByCompany(company_id)
    ]);
    
    queryStr = queryStr.toLowerCase();
    const filtered = users.filter(u => 
      u.first_name.toLowerCase().includes(queryStr) || 
      u.last_name.toLowerCase().includes(queryStr) || 
      u.email.toLowerCase().includes(queryStr)
    );
    
    const paginated = filtered.slice(offset, offset + limit);
    return { 
      users: paginated.map(({ password_hash, ...u }) => { void password_hash; return u; }), 
      total: filtered.length, 
      page, 
      limit, 
      pages: Math.ceil(filtered.length / limit) 
    };
  }
}

export const usersService = new UsersService();
