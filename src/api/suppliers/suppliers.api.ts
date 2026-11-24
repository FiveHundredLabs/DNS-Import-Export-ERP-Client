import { apiDelete, apiGet, apiGetPaginated, apiPatch, apiPost } from '../client';
import type {
  CreateSupplierPayload,
  DeleteSupplierResponse,
  PaginatedSuppliersResponse,
  Supplier,
  SupplierListParams,
  UpdateSupplierPayload,
} from './suppliers.types';

export const suppliersApi = {
  list: async (
    params: SupplierListParams = {},
    signal?: AbortSignal,
  ): Promise<PaginatedSuppliersResponse> => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(Math.min(params.limit, 100)));
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortOrder) query.set('sortOrder', params.sortOrder);

    const queryString = query.toString();
    const result = await apiGetPaginated<Supplier>(
      '/suppliers' + (queryString ? '?' + queryString : ''),
      { signal, suppressErrorToast: true },
    );

    return {
      data: result.data,
      meta: {
        ...result.meta,
        totalPages: Math.ceil(result.meta.total / Math.max(result.meta.pageSize, 1)),
      },
    };
  },

  lookup: async (signal?: AbortSignal): Promise<Supplier[]> => {
    return apiGet<Supplier[]>('/suppliers/lookup', {
      signal,
      suppressErrorToast: true,
    });
  },

  getById: (id: string, signal?: AbortSignal): Promise<Supplier> =>
    apiGet<Supplier>('/suppliers/' + encodeURIComponent(id), {
      signal,
      suppressErrorToast: true,
    }),

  create: (payload: CreateSupplierPayload): Promise<Supplier> =>
    apiPost<Supplier>('/suppliers', payload, { suppressErrorToast: true }),

  update: (id: string, payload: UpdateSupplierPayload): Promise<Supplier> =>
    apiPatch<Supplier>('/suppliers/' + encodeURIComponent(id), payload, {
      suppressErrorToast: true,
    }),

  delete: (id: string): Promise<DeleteSupplierResponse> =>
    apiDelete<DeleteSupplierResponse>('/suppliers/' + encodeURIComponent(id), {
      suppressErrorToast: true,
    }),
};
