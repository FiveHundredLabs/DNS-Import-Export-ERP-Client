import { IUserRepository } from '../repositories/IUserRepository';
import { MockUserRepository } from '../repositories/mock/MockUserRepository';
import { User } from '../types/auth';

export class UserService {
  private repo: IUserRepository;
  
  constructor() {
    this.repo = new MockUserRepository();
  }

  async getUsers(): Promise<User[]> {
    return this.repo.getAll();
  }

  async createUser(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    return this.repo.create(data);
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    return this.repo.update(id, data);
  }

  async deleteUser(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}

export const userService = new UserService();
