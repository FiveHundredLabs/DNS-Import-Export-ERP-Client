import { useState, useEffect, useCallback } from 'react';
import { User, UserRole, Permission } from '../types/auth';
import { authService } from '../services/AuthService';
import { hasPermission, canAccessRoute } from '../rules/permissions';
import { MOCK_USERS } from '../mock/mockUsers';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => authService.getCurrentUser());

  useEffect(() => {
    return authService.subscribe((user) => {
      setCurrentUser(user ? { ...user } : null);
    });
  }, []);

  const switchRole = useCallback((role: UserRole) => {
    const updated = authService.switchRole(role);
    setCurrentUser({ ...updated });
    return updated;
  }, []);

  const loginAs = useCallback((userId: string) => {
    const updated = authService.loginAs(userId);
    setCurrentUser({ ...updated });
    return updated;
  }, []);

  const loginWithEmail = useCallback((email: string, password?: string) => {
    const updated = authService.loginWithEmail(email, password);
    setCurrentUser({ ...updated });
    return updated;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setCurrentUser(null);
  }, []);

  const activeUser: User = currentUser || MOCK_USERS[0];
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
    currentUser: currentUser || activeUser,
    user: currentUser || activeUser,
    rawUser: currentUser,
    isAuthenticated: currentUser !== null,
    role,
    switchRole,
    loginAs,
    loginWithEmail,
    logout,
    hasPermission: checkPermission,
    canAccessRoute: canAccess,
  };
}

