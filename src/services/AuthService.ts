import { ApiSuccessResponse, apiClient, clearAccessToken, refreshAccessToken, setAccessToken } from '../api/axios';
import { clearAppCache } from '../api/queryClient';
import { User, UserRole } from '../types/auth';

const BackendRoleCodes: UserRole[] = [
  'DIRECTOR',
  'MANAGER',
  'SALES_MANAGER',
  'AREA_MANAGER',
  'SALES_REP',
  'FINANCE_MANAGER',
  'FINANCE_OFFICER',
  'PURCHASING_MANAGER',
  'PURCHASING_OFFICER',
  'SHOWROOM_MANAGER',
  'SHOWROOM_CASHIER',
  'STOCK_KEEPER',
  'STOCK_MANAGER',
];

interface BackendRole {
  id: string;
  code: string;
  name: string;
}

interface BackendUser {
  id: string;
  fullName: string;
  displayName: string;
  email: string;
  role: string | BackendRole;
  phone?: string | null;
  areaId?: string | null;
  profileImage?: string | null;
  status: string;
  birthday?: string | null;
}

interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: BackendUser;
}

type AuthListener = (user: User | null) => void;

function mapRole(role: BackendUser['role']): UserRole {
  const roleCode = typeof role === 'string' ? role : role.code;

  if (!BackendRoleCodes.includes(roleCode as UserRole)) {
    throw new Error(`Unsupported backend role: ${roleCode}`);
  }

  return roleCode as UserRole;
}

function mapUser(user: BackendUser): User {
  return {
    id: user.id,
    name: user.displayName || user.fullName,
    email: user.email,
    role: mapRole(user.role),
    phone: user.phone || '',
    areaId: user.areaId || undefined,
    avatarUrl: user.profileImage || undefined,
    isActive: user.status === 'ACTIVE',
    birthDate: user.birthday || undefined,
  };
}

export class AuthService {
  private currentUser: User | null = null;
  private listeners: Set<AuthListener> = new Set();
  private restorePromise: Promise<User | null> | null = null;
  private initialized = false;

  isInitialized(): boolean {
    return this.initialized;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async restoreSession(): Promise<User | null> {
    // If a valid session is already in memory (e.g. fresh login), do NOT rotate token!
    if (this.currentUser) {
      this.initialized = true;
      return this.currentUser;
    }

    // If session bootstrap already ran and determined there is no session, don't re-run.
    if (this.initialized) {
      return this.currentUser;
    }

    if (this.restorePromise) {
      return this.restorePromise;
    }

    this.restorePromise = (async () => {
      try {
        await refreshAccessToken();
        const response = await apiClient.get<ApiSuccessResponse<BackendUser>>('/auth/me', {
          suppressErrorToast: true,
          suppressErrorRedirect: true,
        });
        this.setCurrentUser(mapUser(response.data.data));
        return this.currentUser;
      } catch {
        this.clearSession();
        return null;
      } finally {
        this.initialized = true;
        this.restorePromise = null;
      }
    })();

    return this.restorePromise;
  }

  async loginWithEmail(email: string, password: string): Promise<User> {
    clearAppCache(); // Flush prior cached data before new session
    const response = await apiClient.post<ApiSuccessResponse<LoginResponse>>(
      '/auth/login',
      { email, password },
      { skipAuthRefresh: true },
    );

    setAccessToken(response.data.data.accessToken);
    if (response.data.data.refreshToken && typeof window !== 'undefined') {
      localStorage.setItem('dns_refresh_token', response.data.data.refreshToken);
    }
    const user = mapUser(response.data.data.user);
    this.initialized = true;
    this.setCurrentUser(user);
    return user;
  }

  async logout(): Promise<void> {
    try {
      if (this.currentUser) {
        // Best-effort server revocation using the current in-memory access token.
        // The apiClient interceptor will attempt one automatic refresh if the token
        // is expired. Do NOT pre-refresh here — if the refresh cookie is already
        // invalid, a pre-refresh call would throw without ever hitting /auth/logout,
        // leaving the backend session open for its full 7-day TTL.
        await apiClient.post('/auth/logout', undefined, {
          suppressErrorToast: true,
          suppressErrorRedirect: true,
        });
      }
    } finally {
      this.clearSession();
    }
  }

  async logoutAll(): Promise<void> {
    try {
      if (this.currentUser) {
        // Same rationale as logout() — skip the pre-refresh; let the interceptor handle
        // token expiry automatically on the actual /auth/logout-all call.
        await apiClient.post('/auth/logout-all', undefined, {
          suppressErrorToast: true,
          suppressErrorRedirect: true,
        });
      }
    } finally {
      this.clearSession();
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.post(
      '/auth/change-password',
      { currentPassword, newPassword },
    );
    this.clearSession();
  }

  updateProfile(updates: Partial<User>): User {
    if (!this.currentUser) {
      throw new Error('Not authenticated');
    }

    const updatedUser = { ...this.currentUser, ...updates };
    this.setCurrentUser(updatedUser);
    return updatedUser;
  }

  switchRole(_role: UserRole): User {
    throw new Error('Role switching is not available with backend authentication.');
  }

  loginAs(_userId: string): User {
    throw new Error('Demo login is not available with backend authentication.');
  }

  private setCurrentUser(user: User): void {
    this.currentUser = user;
    this.notify();
  }

  private clearSession(): void {
    clearAccessToken();
    clearAppCache();
    this.currentUser = null;
    this.initialized = true;
    this.notify();
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener(this.currentUser));
  }
}

export const authService = new AuthService();
