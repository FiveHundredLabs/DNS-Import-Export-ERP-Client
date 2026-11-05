import { IUserRepository } from '../IUserRepository';
import { MOCK_USERS } from '../../mock/mockUsers';
import { User } from '../../types/auth';

const USERS_STORAGE_KEY = 'dns_erp_users_v1';

export class MockUserRepository implements IUserRepository {
  private users: User[] = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(USERS_STORAGE_KEY);
        if (stored) {
          const parsed: User[] = JSON.parse(stored);
          const existingIds = new Set(parsed.map((u) => u.id));
          const missing = MOCK_USERS.filter((u) => !existingIds.has(u.id));
          this.users = [...parsed, ...JSON.parse(JSON.stringify(missing))];
          if (missing.length > 0) {
            this.persist();
          }
        } else {
          this.users = JSON.parse(JSON.stringify(MOCK_USERS));
          this.persist();
        }
      } else {
        this.users = JSON.parse(JSON.stringify(MOCK_USERS));
      }
    } catch {
      this.users = JSON.parse(JSON.stringify(MOCK_USERS));
    }
  }

  private persist(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(this.users));
      }
    } catch {}
  }

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
    this.persist();
    return newUser;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    await new Promise(r => setTimeout(r, 100));
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) throw new Error(`User with id ${id} not found.`);
    this.users[index] = { ...this.users[index], ...data };
    this.persist();
    return this.users[index];
  }

  async delete(id: string): Promise<void> {
    await new Promise(r => setTimeout(r, 100));
    this.users = this.users.filter(u => u.id !== id);
    this.persist();
  }
}
