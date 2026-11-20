import { apiGet, apiPost, apiPatch, apiDelete } from '../client';
import {
  Brand,
  CreateBrandPayload,
  ListBrandsParams,
  UpdateBrandPayload,
  UpdateBrandStatusPayload,
} from './brands.types';

export const brandsApi = {
  listBrands: async (params?: ListBrandsParams, signal?: AbortSignal): Promise<Brand[]> => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);

    const qs = query.toString();
    const url = `/brands${qs ? `?${qs}` : ''}`;
    return apiGet<Brand[]>(url, { signal });
  },

  getBrandById: async (id: string, signal?: AbortSignal): Promise<Brand> => {
    return apiGet<Brand>(`/brands/${id}`, { signal });
  },

  createBrand: async (payload: CreateBrandPayload): Promise<Brand> => {
    return apiPost<Brand>('/brands', payload, {
      successMessage: 'Brand created successfully',
    });
  },

  updateBrand: async (id: string, payload: UpdateBrandPayload): Promise<Brand> => {
    return apiPatch<Brand>(`/brands/${id}`, payload, {
      successMessage: 'Brand updated successfully',
    });
  },

  updateBrandStatus: async (id: string, payload: UpdateBrandStatusPayload): Promise<Brand> => {
    return apiPatch<Brand>(`/brands/${id}/status`, payload, {
      successMessage: `Brand ${payload.status === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`,
    });
  },

  deleteBrand: async (id: string): Promise<void> => {
    return apiDelete<void>(`/brands/${id}`, {
      successMessage: 'Brand deleted successfully',
    });
  },
};
