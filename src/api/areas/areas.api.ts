import { apiGetPaginated, apiGet, apiPost, apiPatch, apiDelete } from '../client';
import {
  Area,
  CreateAreaPayload,
  ListAreasParams,
  PaginatedAreasResponse,
  UpdateAreaPayload,
  UpdateAreaStatusPayload,
} from './areas.types';

export const areasApi = {
  listAreas: async (params?: ListAreasParams, signal?: AbortSignal): Promise<PaginatedAreasResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('pageSize', String(Math.min(params.pageSize, 100)));
    if (params?.search) query.set('search', params.search);
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

    const qs = query.toString();
    const url = `/areas${qs ? `?${qs}` : ''}`;
    const result = await apiGetPaginated<Area>(url, { signal });
    return {
      data: result.data,
      meta: {
        ...result.meta,
        totalPages: Math.ceil(result.meta.total / (result.meta.pageSize || 20)),
      },
    };
  },

  getAreaById: async (id: string, signal?: AbortSignal): Promise<Area> => {
    return apiGet<Area>(`/areas/${id}`, { signal });
  },

  createArea: async (payload: CreateAreaPayload): Promise<Area> => {
    return apiPost<Area>('/areas', payload, {
      successMessage: 'Sales area created successfully',
    });
  },

  updateArea: async (id: string, payload: UpdateAreaPayload): Promise<Area> => {
    return apiPatch<Area>(`/areas/${id}`, payload, {
      successMessage: 'Sales area updated successfully',
    });
  },

  updateAreaStatus: async (id: string, payload: UpdateAreaStatusPayload): Promise<Area> => {
    return apiPatch<Area>(`/areas/${id}/status`, payload, {
      successMessage: `Sales area ${payload.status === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`,
    });
  },

  deleteArea: async (id: string): Promise<void> => {
    return apiDelete<void>(`/areas/${id}`, {
      successMessage: 'Sales area deleted successfully',
    });
  },
};
