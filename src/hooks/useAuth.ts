import { useState, useEffect, useCallback } from 'react';
import { User, UserRole, Permission } from '../types/auth';
import { authService } from '../services/AuthService';
import { hasPermission, canAccessRoute } from '../rules/permissions';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => authService.getCurrentUser());
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.subscribe((user) => {
      setCurrentUser(user ? { ...user } : null);
    });

    void authService.restoreSession().finally(() => setIsInitializing(false));

    return unsubscribe;
  }, []);

  const switchRole = useCallback((role: UserRole) => {
    return authService.switchRole(role);
  }, []);

  const loginAs = useCallback((userId: string) => {
    return authService.loginAs(userId);
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    return authService.loginWithEmail(email, password);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
  }, []);

  const role: UserRole = currentUser ? currentUser.role : 'DIRECTOR';

  const checkPermission = useCallback(
    (permission: Permission): boolean => {
      if (!currentUser) return false;
      return hasPermission(currentUser.role, permission);
    },
    [currentUser]
  );

  const canAccess = useCallback(
    (path: string): boolean => {
      if (!currentUser) return false;
      return canAccessRoute(currentUser.role, path);
    },
    [currentUser]
  );

  return {
    currentUser: currentUser as User,
    user: currentUser as User,
    rawUser: currentUser,
    isAuthenticated: currentUser !== null,
    isInitializing,
    role,
    switchRole,
    loginAs,
    loginWithEmail,
    logout,
    hasPermission: checkPermission,
    canAccessRoute: canAccess,
  };
}

