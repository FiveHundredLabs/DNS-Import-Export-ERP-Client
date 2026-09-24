import { useState, useEffect, useCallback } from 'react';
import { User, UserRole, Permission } from '../types/auth';
import { authService } from '../services/AuthService';
import { hasPermission, canAccessRoute } from '../rules/permissions';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<User>(authService.getCurrentUser());

  useEffect(() => {
    setCurrentUser(authService.getCurrentUser());
  }, []);

  const switchRole = useCallback((role: UserRole) => {
    const updated = authService.switchRole(role);
    setCurrentUser({ ...updated });
  }, []);

  const checkPermission = useCallback(
    (permission: Permission): boolean => {
      return hasPermission(currentUser.role, permission);
    },
    [currentUser.role]
  );

  const canAccess = useCallback(
    (path: string): boolean => {
      return canAccessRoute(currentUser.role, path);
    },
    [currentUser.role]
  );

  return {
    currentUser,
    role: currentUser.role,
    switchRole,
    hasPermission: checkPermission,
    canAccessRoute: canAccess,
  };
}
