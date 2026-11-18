import { create } from 'zustand';
import { User, UserRole } from '../types/auth';
import { clearAppCache } from '../api/queryClient';
import { clearAccessToken } from '../api/client';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  role: UserRole;
  setUser: (user: User | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  role: 'DIRECTOR',
  setUser: (user) =>
    set({
      user,
      isAuthenticated: user !== null,
      role: user ? user.role : 'DIRECTOR',
    }),
  clearAuth: () => {
    clearAccessToken();
    clearAppCache();
    set({
      user: null,
      isAuthenticated: false,
      role: 'DIRECTOR',
    });
  },
}));
