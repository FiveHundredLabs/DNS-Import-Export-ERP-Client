import { User, UserRole } from '../types/auth';
import { MOCK_USERS } from '../mock/mockUsers';

const AUTH_STORAGE_KEY = 'dns_erp_current_user';
const LOGGED_OUT_KEY = 'dns_erp_is_logged_out';

type AuthListener = (user: User | null) => void;

export class AuthService {
  private currentUser: User | null = null;
  private listeners: Set<AuthListener> = new Set();

  constructor() {
    const isLoggedOut = localStorage.getItem(LOGGED_OUT_KEY) === 'true';
    if (isLoggedOut) {
      this.currentUser = null;
      return;
    }

    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) {
          const found = MOCK_USERS.find((u) => u.id === parsed.id);
          this.currentUser = found || parsed;
          return;
        }
      } catch {
        // Fallback
      }
    }
    // Default to DIRECTOR for development
    this.currentUser = MOCK_USERS[0];
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentUser);
      } catch (err) {
        console.error('Error in auth listener:', err);
      }
    });
  }

  switchRole(role: UserRole): User {
    const user = MOCK_USERS.find((u) => u.role === role);
    if (!user) throw new Error(`No mock user configured for role: ${role}`);
    this.currentUser = user;
    localStorage.removeItem(LOGGED_OUT_KEY);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    this.notify();
    return user;
  }

  loginAs(userId: string): User {
    const user = MOCK_USERS.find((u) => u.id === userId || u.role === userId);
    if (!user) throw new Error(`User not found: ${userId}`);
    this.currentUser = user;
    localStorage.removeItem(LOGGED_OUT_KEY);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    this.notify();
    return user;
  }

  loginWithEmail(email: string, _password?: string): User {
    const normalized = email.trim().toLowerCase();
    const user = MOCK_USERS.find((u) => u.email.toLowerCase() === normalized);
    if (!user) {
      throw new Error(`No registered account found for "${email}". Please select one of the example users below.`);
    }
    this.currentUser = user;
    localStorage.removeItem(LOGGED_OUT_KEY);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    this.notify();
    return user;
  }

  logout(): void {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.setItem(LOGGED_OUT_KEY, 'true');
    this.currentUser = null;
    this.notify();
  }
}

export const authService = new AuthService();

