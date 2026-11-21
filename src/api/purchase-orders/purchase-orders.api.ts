import { apiDelete, apiGet, apiGetPaginated, apiPatch, apiPost } from '../client';
import type {
  CreatePurchaseOrderPayload,
  PurchaseOrderActionPayload,
  PurchaseOrderApiRecord,
  PurchaseOrderDeleteResponse,
  PurchaseOrderListParams,
  PurchaseOrderPage,
  PurchaseOrderRecord,
  PurchaseOrderRemainingItemsRecord,
  UpdatePurchaseOrderPayload,
} from './purchase-orders.types';
import { mapPurchaseOrder } from './purchase-orders.types';

function buildQuery(params: PurchaseOrderListParams): string {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(Math.min(params.limit, 100)));
  if (params.status) query.set('status', params.status);
  if (params.supplierId) query.set('supplierId', params.supplierId);
  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);
  return query.toString();
}

export const purchaseOrdersApi = {
  list: async (params: PurchaseOrderListParams = {}, signal?: AbortSignal): Promise<PurchaseOrderPage> => {
    const qs = buildQuery(params);
    const result = await apiGetPaginated<PurchaseOrderApiRecord>(`/purchase-orders${qs ? `?${qs}` : ''}`, {
      signal,
      suppressErrorToast: true,
    });
    return {
      data: result.data.map(mapPurchaseOrder),
      meta: {
        page: result.meta.page,
        pageSize: result.meta.pageSize,
        total: result.meta.total,
        totalPages: Math.ceil(result.meta.total / Math.max(result.meta.pageSize, 1)),
      },
    };
  },

  getById: async (id: string, signal?: AbortSignal) =>
    mapPurchaseOrder(
      await apiGet<PurchaseOrderApiRecord>(`/purchase-orders/${encodeURIComponent(id)}`, {
        signal,
        suppressErrorToast: true,
      }),
    ),

  remainingItems: (id: string, signal?: AbortSignal) =>
    apiGet<PurchaseOrderRemainingItemsRecord>(`/purchase-orders/${encodeURIComponent(id)}/remaining-items`, {
      signal,
      suppressErrorToast: true,
    }),

  activity: (id: string, signal?: AbortSignal): Promise<PurchaseOrderRecord[]> =>
    apiGet<PurchaseOrderRecord[]>(`/purchase-orders/${encodeURIComponent(id)}/activity`, {
      signal,
      suppressErrorToast: true,
    }),

  create: (payload: CreatePurchaseOrderPayload) =>
    apiPost<PurchaseOrderApiRecord>('/purchase-orders', payload, { suppressErrorToast: true }),

  update: (id: string, payload: UpdatePurchaseOrderPayload) =>
    apiPatch<PurchaseOrderApiRecord>(`/purchase-orders/${encodeURIComponent(id)}`, payload, {
      suppressErrorToast: true,
    }),

  delete: (id: string) =>
    apiDelete<PurchaseOrderDeleteResponse>(`/purchase-orders/${encodeURIComponent(id)}`, {
      suppressErrorToast: true,
    }),

  submit: (id: string, payload: PurchaseOrderActionPayload = {}) =>
    apiPost<PurchaseOrderApiRecord>(`/purchase-orders/${encodeURIComponent(id)}/submit`, payload, {
      suppressErrorToast: true,
    }),

  verify: (id: string, payload: PurchaseOrderActionPayload) =>
    apiPost<PurchaseOrderApiRecord>(`/purchase-orders/${encodeURIComponent(id)}/verify`, payload, {
      suppressErrorToast: true,
    }),

  approve: (id: string, payload: PurchaseOrderActionPayload, asDirector: boolean) =>
    apiPost<PurchaseOrderApiRecord>(
      `/purchase-orders/${encodeURIComponent(id)}/${asDirector ? 'approve-director' : 'approve'}`,
      payload,
      { suppressErrorToast: true },
    ),

  reject: (id: string, payload: PurchaseOrderActionPayload, duringVerification: boolean) =>
    apiPost<PurchaseOrderApiRecord>(
      `/purchase-orders/${encodeURIComponent(id)}/${duringVerification ? 'reject' : 'reject-approval'}`,
      payload,
      { suppressErrorToast: true },
    ),

  revise: (id: string) =>
    apiPost<PurchaseOrderApiRecord>(`/purchase-orders/${encodeURIComponent(id)}/revise`, undefined, {
      suppressErrorToast: true,
    }),

  issue: (id: string, payload: PurchaseOrderActionPayload = {}) =>
    apiPost<PurchaseOrderApiRecord>(`/purchase-orders/${encodeURIComponent(id)}/issue`, payload, {
      suppressErrorToast: true,
    }),
};
