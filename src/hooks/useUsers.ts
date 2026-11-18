import { useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types/auth';
import { usersApi } from '../api/users/users.api';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await usersApi.listUsers({ pageSize: 100, status: 'ACTIVE' });
      const mapped: User[] = response.data.map((u) => {
        const roleCode = (typeof u.role === 'string' ? u.role : u.role?.code || u.roleCode || 'SALES_REP') as UserRole;
        return {
          id: u.id,
          name: u.displayName || u.fullName,
          email: u.email,
          role: roleCode,
          phone: u.phone || '',
          areaId: u.areaId || undefined,
          isActive: u.status === 'ACTIVE',
        };
      });
      setUsers(mapped);
    } catch (e) {
      console.error('Failed to fetch users from backend:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    refetch: fetchUsers,
  };
}
