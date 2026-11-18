import { apiGetPaginated, apiGet, apiPost, apiPatch, apiDelete } from '../client';
import { Area, ListAreasParams, PaginatedAreasResponse } from './areas.types';

export const areasApi = {
  listAreas: async (params?: ListAreasParams, signal?: AbortSignal): Promise<PaginatedAreasResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    // Safe pageSize: backend allows max 100
    if (params?.pageSize) query.set('pageSize', String(Math.min(params.pageSize, 100)));
    if (params?.search) query.set('search', params.search);
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

  createArea: async (data: { areaName: string; description?: string }): Promise<Area> => {
    return apiPost<Area>('/areas', data);
  },

  updateArea: async (
    id: string,
    data: { areaName?: string; description?: string | null; updatedAt?: string },
  ): Promise<Area> => {
    return apiPatch<Area>(`/areas/${id}`, {
      ...data,
      updatedAt: data.updatedAt || new Date().toISOString(),
    });
  },

  deleteArea: async (id: string): Promise<void> => {
    return apiDelete<void>(`/areas/${id}`);
  },
};
