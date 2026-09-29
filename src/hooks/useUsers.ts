import { useState, useEffect, useCallback } from 'react';
import { User } from '../types/auth';
import { userService } from '../services/UserService';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userService.getUsers();
      setUsers(data);
    } catch (e) {
      console.error(e);
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
    createUser: async (data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => {
      await userService.createUser(data);
      await fetchUsers();
    },
    updateUser: async (id: string, data: Partial<User>) => {
      await userService.updateUser(id, data);
      await fetchUsers();
    },
    deleteUser: async (id: string) => {
      await userService.deleteUser(id);
      await fetchUsers();
    }
  };
}
