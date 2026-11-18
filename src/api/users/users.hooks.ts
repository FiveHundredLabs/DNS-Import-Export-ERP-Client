import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { usersApi } from './users.api';
import { UserSummary, ListUsersParams, PaginatedUsersResponse } from './users.types';

export const userQueryKeys = {
  all: ['users'] as const,
  lists: () => [...userQueryKeys.all, 'list'] as const,
  list: (params?: ListUsersParams) => [...userQueryKeys.lists(), params] as const,
  details: () => [...userQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...userQueryKeys.details(), id] as const,
};

export function useUsers(params?: ListUsersParams): UseQueryResult<PaginatedUsersResponse, Error> {
  return useQuery({
    queryKey: userQueryKeys.list(params),
    queryFn: ({ signal }) => usersApi.listUsers(params, signal),
    staleTime: 300_000, // Users/Roles are reference data — 5 min cache
  });
}

export function useUser(id: string): UseQueryResult<UserSummary, Error> {
  return useQuery({
    queryKey: userQueryKeys.detail(id),
    queryFn: ({ signal }) => usersApi.getUserById(id, signal),
    enabled: Boolean(id),
    staleTime: 300_000,
  });
}
