import { apiGet, apiPost, apiPatch } from '../client';
import {
  Category,
  CreateCategoryPayload,
  ListCategoriesParams,
  UpdateCategoryPayload,
  UpdateCategoryStatusPayload,
} from './categories.types';

export const categoriesApi = {
  listCategories: async (params?: ListCategoriesParams, signal?: AbortSignal): Promise<Category[]> => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);

    const qs = query.toString();
    const url = `/categories${qs ? `?${qs}` : ''}`;
    return apiGet<Category[]>(url, { signal });
  },

  getCategoryById: async (id: string, signal?: AbortSignal): Promise<Category> => {
    return apiGet<Category>(`/categories/${id}`, { signal });
  },

  createCategory: async (payload: CreateCategoryPayload): Promise<Category> => {
    return apiPost<Category>('/categories', payload, {
      successMessage: 'Category created successfully',
    });
  },

  updateCategory: async (id: string, payload: UpdateCategoryPayload): Promise<Category> => {
    return apiPatch<Category>(`/categories/${id}`, payload, {
      successMessage: 'Category updated successfully',
    });
  },

  updateCategoryStatus: async (id: string, payload: UpdateCategoryStatusPayload): Promise<Category> => {
    return apiPatch<Category>(`/categories/${id}/status`, payload, {
      successMessage: `Category ${payload.status === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`,
    });
  },
};
