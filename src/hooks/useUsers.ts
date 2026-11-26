import { useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User, UserRole } from '../types/auth';
import { usersApi } from '../api/users/users.api';
import { userQueryKeys } from '../api/users/users.hooks';
import { areaQueryKeys } from '../api/areas/areas.hooks';
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
  const queryClient = useQueryClient();

  const mergedParams = useMemo<ListUsersParams>(
    () => ({ pageSize: 100, ...initialParams }),
    [initialParams],
  );

  const {
    data: response,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: userQueryKeys.list(mergedParams),
    queryFn: ({ signal }) => usersApi.listUsers(mergedParams, signal),
    staleTime: 300_000,
    retry: 1,
  });

  const rawUsers = useMemo<UserSummary[]>(
    () => response?.data ?? [],
    [response],
  );

  const users = useMemo<User[]>(
    () => (response?.data ? response.data.map(mapUserSummaryToUser) : MOCK_USERS),
    [response],
  );

  const error = queryError instanceof Error ? queryError.message : queryError ? 'Failed to fetch users' : null;

  const fetchUsers = useCallback(async (params?: ListUsersParams) => {
    if (params) {
      await queryClient.invalidateQueries({ queryKey: userQueryKeys.list({ pageSize: 100, ...params }) });
    } else {
      await refetch();
    }
  }, [queryClient, refetch]);

  const invalidateUserAndAreaCaches = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: userQueryKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: areaQueryKeys.lists() }),
    ]);
  }, [queryClient]);

  const createUser = useCallback(
    async (payload: CreateUserPayload): Promise<UserSummary> => {
      const created = await usersApi.createUser(payload);
      await invalidateUserAndAreaCaches();
      return created;
    },
    [invalidateUserAndAreaCaches],
  );

  const updateUser = useCallback(
    async (id: string, payload: UpdateUserPayload): Promise<UserSummary> => {
      const updated = await usersApi.updateUser(id, payload);
      await invalidateUserAndAreaCaches();
      return updated;
    },
    [invalidateUserAndAreaCaches],
  );

  const changeRole = useCallback(
    async (id: string, roleId: string, updatedAt: string): Promise<UserSummary> => {
      const updated = await usersApi.changeUserRole(id, { roleId, updatedAt });
      await invalidateUserAndAreaCaches();
      return updated;
    },
    [invalidateUserAndAreaCaches],
  );

  const changeStatus = useCallback(
    async (id: string, status: UserStatus, updatedAt: string): Promise<UserSummary> => {
      const updated = await usersApi.changeUserStatus(id, { status, updatedAt });
      await invalidateUserAndAreaCaches();
      return updated;
    },
    [invalidateUserAndAreaCaches],
  );

  const deleteUser = useCallback(
    async (id: string): Promise<void> => {
      await usersApi.deleteUser(id);
      await invalidateUserAndAreaCaches();
    },
    [invalidateUserAndAreaCaches],
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
