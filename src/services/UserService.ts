import { usersApi } from '../api/users/users.api';
import { User, UserRole } from '../types/auth';
import { UserSummary } from '../api/users/users.types';

function mapSummaryToUser(u: UserSummary): User {
  const roleCode = (typeof u.role === 'string'
    ? u.role
    : u.role?.code || u.roleCode || 'SALES_REP') as UserRole;
  const roleId = typeof u.role === 'object' && u.role ? u.role.id : u.roleId;
  const areaName = typeof u.area === 'object' && u.area ? u.area.areaName : undefined;

  return {
    id: u.id,
    name: u.displayName || u.fullName,
    fullName: u.fullName,
    displayName: u.displayName || u.fullName,
    email: u.email,
    role: roleCode,
    roleId,
    phone: u.phone || '',
    areaId: u.areaId || undefined,
    areaName,
    status: u.status,
    isActive: u.status === 'ACTIVE',
    joinedDate: u.joinedDate,
    updatedAt: u.updatedAt,
    avatarUrl: u.profileImage || undefined,
  };
}

export class UserService {
  async getUsers(): Promise<User[]> {
    try {
      const res = await usersApi.listUsers({ pageSize: 100 });
      return res.data.map(mapSummaryToUser);
    } catch (e) {
      console.error('Failed to get users from API:', e);
      return [];
    }
  }

  // Alias for backward compatibility with service callers
  async getAll(): Promise<User[]> {
    return this.getUsers();
  }

  async getById(id: string): Promise<User | null> {
    try {
      const u = await usersApi.getUserById(id);
      return mapSummaryToUser(u);
    } catch (e) {
      console.error(`Failed to get user ${id} from API:`, e);
      return null;
    }
  }

  async createUser(data: Partial<User> & { tempPassword?: string }): Promise<User> {
    const payload = {
      fullName: data.fullName || data.name || '',
      displayName: data.displayName || data.name || '',
      email: data.email || '',
      tempPassword: data.tempPassword || 'TempPass123!',
      roleId: data.roleId || '',
      areaId: data.areaId || null,
      joinedDate: data.joinedDate || new Date().toISOString().split('T')[0],
    };
    const created = await usersApi.createUser(payload);
    return mapSummaryToUser(created);
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const updated = await usersApi.updateUser(id, {
      fullName: data.fullName || data.name,
      displayName: data.displayName,
      areaId: data.areaId,
      updatedAt: data.updatedAt || new Date().toISOString(),
    });
    return mapSummaryToUser(updated);
  }

  async deleteUser(id: string): Promise<void> {
    await usersApi.deleteUser(id);
  }
}

export const userService = new UserService();
