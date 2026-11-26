import { apiGet, apiGetPaginated, apiPost } from '../client';
import type {
  AvailableAdvanceItem,
  CreateSupplierPaymentPayload,
  PaginatedSupplierPaymentsResponse,
  SupplierPaymentItem,
  SupplierPaymentQueryParams,
} from './supplier-payments.types';

function buildQueryString(params: SupplierPaymentQueryParams = {}): string {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(Math.min(params.limit, 100)));
  if (params.supplierId) query.set('supplierId', params.supplierId);
  if (params.purchaseOrderId) query.set('purchaseOrderId', params.purchaseOrderId);
  if (params.paymentType) query.set('paymentType', params.paymentType);
  if (params.isAdvance !== undefined) query.set('isAdvance', String(params.isAdvance));
  if (params.status) query.set('status', params.status);
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

export const supplierPaymentsApi = {
  list: async (
    params: SupplierPaymentQueryParams = {},
    signal?: AbortSignal,
  ): Promise<PaginatedSupplierPaymentsResponse> => {
    const qs = buildQueryString(params);
    const result = await apiGetPaginated<SupplierPaymentItem>(`/supplier-payments${qs}`, {
      signal,
      suppressErrorToast: true,
    });

    return {
      data: result.data,
      meta: {
        total: result.meta.total,
        page: result.meta.page,
        limit: result.meta.pageSize,
        totalPages: Math.ceil(result.meta.total / Math.max(result.meta.pageSize, 1)) || 1,
      },
    };
  },

  getAvailableAdvances: async (
    supplierId: string,
    signal?: AbortSignal,
  ): Promise<AvailableAdvanceItem[]> => {
    return apiGet<AvailableAdvanceItem[]>(
      `/supplier-payments/advances/available?supplierId=${encodeURIComponent(supplierId)}`,
      {
        signal,
        suppressErrorToast: true,
      },
    );
  },

  getById: async (id: string, signal?: AbortSignal): Promise<SupplierPaymentItem> => {
    return apiGet<SupplierPaymentItem>(`/supplier-payments/${encodeURIComponent(id)}`, {
      signal,
      suppressErrorToast: true,
    });
  },

  create: async (payload: CreateSupplierPaymentPayload): Promise<SupplierPaymentItem> => {
    return apiPost<SupplierPaymentItem>('/supplier-payments', payload, {
      suppressErrorToast: true,
    });
  },
};
