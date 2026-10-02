import { IUserRepository } from '../IUserRepository';
import { MOCK_USERS } from '../../mock/mockUsers';
import { User } from '../../types/auth';

export class MockUserRepository implements IUserRepository {
  private users: User[] = [...MOCK_USERS];

  async getAll(): Promise<User[]> {
    await new Promise(r => setTimeout(r, 100));
    return [...this.users];
  }

  async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    await new Promise(r => setTimeout(r, 100));
    const newUser: User = {
      ...data,
      id: `usr-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.users.push(newUser);
    return newUser;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    await new Promise(r => setTimeout(r, 100));
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) throw new Error(`User with id ${id} not found.`);
    this.users[index] = { ...this.users[index], ...data };
    return this.users[index];
  }

  async delete(id: string): Promise<void> {
    await new Promise(r => setTimeout(r, 100));
    this.users = this.users.filter(u => u.id !== id);
  }
}
