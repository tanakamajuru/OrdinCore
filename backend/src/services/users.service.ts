import bcrypt from 'bcryptjs';
import { usersRepo } from '../repositories/users.repo';
import { housesRepo } from '../repositories/houses.repo';

export class UsersService {
  async create(company_id: string, data: {
    email: string; password: string; first_name: string; last_name: string; role: string; phone?: string; job_title?: string;
    is_active?: boolean;
    house_id?: string;
    pulse_days?: string[];
  }) {
    const existing = await usersRepo.findByEmail(data.email);
    if (existing) throw new Error('Email already in use');

    const password_hash = await bcrypt.hash(data.password, 12);
    const status = data.is_active === false ? 'inactive' : 'active';
    const user = await usersRepo.create({ company_id, email: data.email, password_hash, first_name: data.first_name, last_name: data.last_name, role: data.role, status });
    await usersRepo.createProfile(user.id, { phone: data.phone, job_title: data.job_title });

    // Handle house assignment
    if (data.house_id) {
      await housesRepo.update(data.house_id, company_id, { manager_id: user.id });
    }

    const { password_hash: _, ...safeUser } = user;
    void _;
    return safeUser;
  }

  async findAll(company_id: string, page = 1, limit = 50, role?: string, status?: string) {
    const offset = (page - 1) * limit;
    const [users, total] = await Promise.all([
      usersRepo.findByCompany(company_id, limit, offset, role, status),
      usersRepo.countByCompany(company_id, role, status),
    ]);
    return { users: users.map(({ password_hash, ...u }) => { void password_hash; return u; }), total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findById(id: string, company_id?: string | null) {
    const user = await usersRepo.findById(id, company_id);
    if (!user) throw new Error('User not found');
    return user;
  }

  async update(id: string, company_id: string | null, data: Partial<{ first_name: string; last_name: string; role: string; status: string; is_active: boolean; house_id: string; pulse_days: string[] }>) {
    const user = await usersRepo.findById(id, company_id);
    if (!user) throw new Error('User not found');
    
    // Map is_active to status if provided
    if (data.is_active !== undefined) {
      data.status = data.is_active ? 'active' : 'inactive';
    }

    // Handle house update
    if (data.house_id && company_id) {
      const role = (data.role || user.role).toUpperCase();
      if (['REGISTERED_MANAGER', 'RM'].includes(role)) {
        await housesRepo.update(data.house_id, company_id, { manager_id: id });
      } else if (['TEAM_LEADER', 'TL'].includes(role)) {
        await usersRepo.assignToHouse(id, data.house_id, company_id);
      }
    }

    const { house_id: _, is_active: ___, ...updateData } = data;
    void _; void ___;

    const updated = await usersRepo.update(id, updateData);
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
