import { apiGet, apiGetPaginated } from '../client';
import type {
  ListStockBalancesParams,
  ListStockMovementsParams,
  PaginatedStockBalancesResponse,
  PaginatedStockMovementsResponse,
  StockBalanceApiItem,
  StockMovementApiItem,
} from './inventory.types';

export const inventoryApi = {
  getStockBalances: async (
    params: ListStockBalancesParams = {},
    signal?: AbortSignal,
  ): Promise<PaginatedStockBalancesResponse> => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('pageSize', String(Math.min(params.pageSize, 100)));
    if (params.search?.trim()) query.set('search', params.search.trim());
    if (params.categoryId) query.set('categoryId', params.categoryId);
    if (params.brandId) query.set('brandId', params.brandId);

    const qs = query.toString();
    const res = await apiGetPaginated<StockBalanceApiItem>(
      `/inventory/balances${qs ? `?${qs}` : ''}`,
      { signal },
    );

    return {
      data: res.data,
      meta: {
        ...res.meta,
        totalPages: Math.ceil(res.meta.total / Math.max(res.meta.pageSize || 20, 1)),
      },
    };
  },

  getProductStockBalance: async (
    productId: string,
    signal?: AbortSignal,
  ): Promise<StockBalanceApiItem> => {
    return apiGet<StockBalanceApiItem>(`/inventory/balances/${productId}`, { signal });
  },

  getStockMovements: async (
    params: ListStockMovementsParams = {},
    signal?: AbortSignal,
  ): Promise<PaginatedStockMovementsResponse> => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('pageSize', String(Math.min(params.pageSize, 100)));
    if (params.productId) query.set('productId', params.productId);
    if (params.movementType) query.set('movementType', params.movementType);
    if (params.referenceDocumentType) query.set('referenceDocumentType', params.referenceDocumentType);
    if (params.fromDate) query.set('fromDate', params.fromDate);
    if (params.toDate) query.set('toDate', params.toDate);

    const qs = query.toString();
    const res = await apiGetPaginated<StockMovementApiItem>(
      `/inventory/movements${qs ? `?${qs}` : ''}`,
      { signal },
    );

    return {
      data: res.data,
      meta: {
        ...res.meta,
        totalPages: Math.ceil(res.meta.total / Math.max(res.meta.pageSize || 20, 1)),
      },
    };
  },
};
