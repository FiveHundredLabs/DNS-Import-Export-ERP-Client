import { apiGetPaginated, apiGet, apiPost, apiPatch, apiDelete } from '../client';
import {
  UserSummary,
  ListUsersParams,
  PaginatedUsersResponse,
  CreateUserPayload,
  UpdateUserPayload,
  ChangeUserRolePayload,
  ChangeUserStatusPayload,
} from './users.types';

export const usersApi = {
  listUsers: async (params?: ListUsersParams, signal?: AbortSignal): Promise<PaginatedUsersResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    // Backend @Max(100) safety guard
    if (params?.pageSize) query.set('pageSize', String(Math.min(params.pageSize, 100)));
    if (params?.search) query.set('search', params.search);
    if (params?.roleCode) query.set('roleCode', params.roleCode);
    if (params?.areaId) query.set('areaId', params.areaId);
    if (params?.status) query.set('status', params.status);
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

    const qs = query.toString();
    const url = `/users${qs ? `?${qs}` : ''}`;
    const result = await apiGetPaginated<UserSummary>(url, { signal });
    return {
      data: result.data,
      meta: {
        ...result.meta,
        totalPages: Math.ceil(result.meta.total / (result.meta.pageSize || 20)),
      },
    };
  },

  getUserById: async (id: string, signal?: AbortSignal): Promise<UserSummary> => {
    return apiGet<UserSummary>(`/users/${id}`, { signal });
  },

  createUser: async (payload: CreateUserPayload): Promise<UserSummary> => {
    return apiPost<UserSummary>('/users', payload);
  },

  updateUser: async (id: string, payload: UpdateUserPayload): Promise<UserSummary> => {
    return apiPatch<UserSummary>(`/users/${id}`, payload);
  },

  changeUserRole: async (id: string, payload: ChangeUserRolePayload): Promise<UserSummary> => {
    return apiPatch<UserSummary>(`/users/${id}/role`, payload);
  },

  changeUserStatus: async (id: string, payload: ChangeUserStatusPayload): Promise<UserSummary> => {
    return apiPatch<UserSummary>(`/users/${id}/status`, payload);
  },

  deleteUser: async (id: string): Promise<void> => {
    return apiDelete<void>(`/users/${id}`);
  },
};
