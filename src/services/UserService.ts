import { usersApi } from '../api/users/users.api';
import { User, UserRole } from '../types/auth';

export class UserService {
  async getUsers(): Promise<User[]> {
    try {
      const res = await usersApi.listUsers({ pageSize: 100, status: 'ACTIVE' });
      return res.data.map((u) => {
        const roleCode = (typeof u.role === 'string' ? u.role : u.role?.code || u.roleCode || 'SALES_REP') as UserRole;
        return {
          id: u.id,
          name: u.displayName || u.fullName,
          email: u.email,
          role: roleCode,
          phone: u.phone || '',
          areaId: u.areaId || undefined,
          isActive: u.status === 'ACTIVE',
        };
      });
    } catch (e) {
      console.error('Failed to get users from API:', e);
      return [];
    }
  }

  async createUser(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    return {
      id: `usr-${Date.now()}`,
      name: data.name,
      email: data.email,
      role: data.role,
      phone: data.phone,
      isActive: true,
    };
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    return {
      id,
      name: data.name || '',
      email: data.email || '',
      role: data.role || 'SALES_REP',
      phone: data.phone || '',
      isActive: true,
    };
  }

  async deleteUser(_id: string): Promise<void> {}
}

export const userService = new UserService();
