import { useState, useEffect, useCallback } from 'react';
import { isRequestCanceled } from '../api/client';
import { User, UserRole } from '../types/auth';
import { usersApi } from '../api/users/users.api';
import { MOCK_USERS } from '../mock/mockUsers';
import {
  UserSummary,
  UserStatus,
  ListUsersParams,
  CreateUserPayload,
  UpdateUserPayload,
} from '../api/users/users.types';

function mapUserSummaryToUser(u: UserSummary): User {
  const roleCode = (typeof u.role === 'string'
    ? u.role
    : u.role?.code || u.roleCode || 'SALES_REP') as UserRole;
  const roleId = typeof u.role === 'object' && u.role ? u.role.id : u.roleId;
  const areaName = typeof u.area === 'object' && u.area ? u.area.areaName : undefined;

  return {
    id: u.id,
    name: u.displayName || u.fullName,
    fullName: u.fullName,
    displayName: u.displayName || u.fullName,
    email: u.email,
    role: roleCode,
    roleId,
    phone: u.phone || '',
    areaId: u.areaId || undefined,
    areaName,
    status: u.status,
    isActive: u.status === 'ACTIVE',
    joinedDate: u.joinedDate,
    updatedAt: u.updatedAt,
    avatarUrl: u.profileImage || undefined,
  };
}

export function useUsers(initialParams?: ListUsersParams) {
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [rawUsers, setRawUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (params?: ListUsersParams) => {
    setError(null);
    try {
      const response = await usersApi.listUsers({
        pageSize: 100,
        ...initialParams,
        ...params,
      });
      setRawUsers(response.data);
      setUsers(response.data.map(mapUserSummaryToUser));
    } catch (err: unknown) {
      if (isRequestCanceled(err)) return;
      const msg = err instanceof Error ? err.message : 'Failed to fetch users';
      setError(msg);
      console.warn('Backend users API unavailable, falling back to offline fixtures:', err);
      setUsers(MOCK_USERS);
    } finally {
      setLoading(false);
    }
  }, [initialParams]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const createUser = useCallback(
    async (payload: CreateUserPayload): Promise<UserSummary> => {
      const created = await usersApi.createUser(payload);
      await fetchUsers();
      return created;
    },
    [fetchUsers],
  );

  const updateUser = useCallback(
    async (id: string, payload: UpdateUserPayload): Promise<UserSummary> => {
      const updated = await usersApi.updateUser(id, payload);
      await fetchUsers();
      return updated;
    },
    [fetchUsers],
  );

  const changeRole = useCallback(
    async (id: string, roleId: string, updatedAt: string): Promise<UserSummary> => {
      const updated = await usersApi.changeUserRole(id, { roleId, updatedAt });
      await fetchUsers();
      return updated;
    },
    [fetchUsers],
  );

  const changeStatus = useCallback(
    async (id: string, status: UserStatus, updatedAt: string): Promise<UserSummary> => {
      const updated = await usersApi.changeUserStatus(id, { status, updatedAt });
      await fetchUsers();
      return updated;
    },
    [fetchUsers],
  );

  const deleteUser = useCallback(
    async (id: string): Promise<void> => {
      await usersApi.deleteUser(id);
      await fetchUsers();
    },
    [fetchUsers],
  );

  return {
    users,
    rawUsers,
    loading,
    error,
    refetch: fetchUsers,
    createUser,
    updateUser,
    changeRole,
    changeStatus,
    deleteUser,
  };
}
