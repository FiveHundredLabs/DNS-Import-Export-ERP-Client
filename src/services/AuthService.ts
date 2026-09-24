import { User, UserRole } from '../types/auth';
import { MOCK_USERS } from '../mock/mockUsers';

const AUTH_STORAGE_KEY = 'dns_erp_current_user';

export class AuthService {
  private currentUser: User;

  constructor() {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (saved) {
      try {
        this.currentUser = JSON.parse(saved);
        return;
      } catch {
        // Fallback
      }
    }
    // Default to DIRECTOR for development
    this.currentUser = MOCK_USERS[0];
  }

  getCurrentUser(): User {
    return this.currentUser;
  }

  switchRole(role: UserRole): User {
    const user = MOCK_USERS.find((u) => u.role === role);
    if (!user) throw new Error(`No mock user configured for role: ${role}`);
    this.currentUser = user;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    return user;
  }

  loginAs(userId: string): User {
    const user = MOCK_USERS.find((u) => u.id === userId);
    if (!user) throw new Error(`User not found: ${userId}`);
    this.currentUser = user;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    return user;
  }

  logout(): void {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    this.currentUser = MOCK_USERS[0];
  }
}

export const authService = new AuthService();
