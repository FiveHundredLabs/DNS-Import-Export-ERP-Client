import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { extractErrorMessage } from '../api/client';
import { purchaseOrdersApi } from '../api/purchase-orders/purchase-orders.api';
import type {
  ApiPurchaseOrderStatus,
  CreatePurchaseOrderPayload,
  PurchaseOrderActionPayload,
  PurchaseOrderListParams,
  PurchaseOrderRecord,
  UpdatePurchaseOrderPayload,
} from '../api/purchase-orders/purchase-orders.types';
import { mapPurchaseOrder } from '../api/purchase-orders/purchase-orders.types';
import type { PurchaseOrder, PurchaseOrderStatus } from '../types/purchasing';

async function withActionError<T>(action: () => Promise<T>, fallback: string): Promise<T> {
  try {
    return await action();
  } catch (error) {
    toast.error(extractErrorMessage(error) || fallback);
    throw error;
  }
}

export const purchaseOrderQueryKeys = {
  all: ['purchase-orders'] as const,
  lists: () => [...purchaseOrderQueryKeys.all, 'list'] as const,
  list: (params: PurchaseOrderListParams = {}) => [...purchaseOrderQueryKeys.lists(), params] as const,
  details: () => [...purchaseOrderQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...purchaseOrderQueryKeys.details(), id] as const,
  activity: (id: string) => [...purchaseOrderQueryKeys.detail(id), 'activity'] as const,
};

export function usePurchaseOrderActions() {
  const queryClient = useQueryClient();
  const invalidate = async (id?: string) => {
    await queryClient.invalidateQueries({ queryKey: purchaseOrderQueryKeys.lists() });
    if (id) await queryClient.invalidateQueries({ queryKey: purchaseOrderQueryKeys.detail(id) });
  };

  const createPO = async (payload: CreatePurchaseOrderPayload): Promise<PurchaseOrder> => {
    const { submitForApproval, ...body } = payload;
    const created = await withActionError(() => purchaseOrdersApi.create(body), 'Failed to create purchase order.');
    let record = created;
    if (submitForApproval) {
      try {
        record = await purchaseOrdersApi.submit(created.id);
      } catch (error) {
        await invalidate(created.id);
        toast.error(`Purchase Order ${created.poNumber} was saved as a draft, but submission failed: ${extractErrorMessage(error)}`);
        return mapPurchaseOrder(created);
      }
    }
    await invalidate(record.id);
    const po = mapPurchaseOrder(record);
    toast.success(
      submitForApproval
        ? `Purchase Order ${po.poNumber} created and submitted for verification.`
        : `Purchase Order ${po.poNumber} saved as draft.`,
    );
    return po;
  };

  const updatePO = async (id: string, payload: UpdatePurchaseOrderPayload & { submitForApproval?: boolean }) => {
    const { submitForApproval, ...body } = payload;
    let record = await withActionError(() => purchaseOrdersApi.update(id, body), 'Failed to update purchase order.');
    if (submitForApproval) record = await withActionError(() => purchaseOrdersApi.submit(id), 'Failed to submit purchase order.');
    await invalidate(id);
    return mapPurchaseOrder(record);
  };

  const submitPO = async (id: string, remark?: string) => {
    const record = await withActionError(() => purchaseOrdersApi.submit(id, { remark }), 'Failed to submit purchase order.');
    await invalidate(id);
    const po = mapPurchaseOrder(record);
    toast.success(`Purchase Order ${po.poNumber} submitted for Purchasing Manager verification.`);
    return po;
  };

  const verifyPO = async (id: string, remark: string) => {
    const record = await withActionError(() => purchaseOrdersApi.verify(id, { remark }), 'Failed to verify purchase order.');
    await invalidate(id);
    return mapPurchaseOrder(record);
  };

  const approvePO = async (id: string, remark: string, isDirector: boolean) => {
    const record = await withActionError(() => purchaseOrdersApi.approve(id, { remark }, isDirector), 'Failed to approve purchase order.');
    await invalidate(id);
    return mapPurchaseOrder(record);
  };

  const rejectPO = async (id: string, rejectionReason: string, status: PurchaseOrderStatus) => {
    const duringVerification = status === 'PENDING_VERIFICATION';
    const record = await withActionError(() => purchaseOrdersApi.reject(id, { rejectionReason }, duringVerification), 'Failed to reject purchase order.');
    await invalidate(id);
    return mapPurchaseOrder(record);
  };

  const revisePO = async (id: string) => {
    const record = await withActionError(() => purchaseOrdersApi.revise(id), 'Failed to create purchase order revision.');
    await invalidate(id);
    await invalidate(record.id);
    return mapPurchaseOrder(record);
  };

  const issuePO = async (id: string, remark?: string) => {
    const record = await withActionError(() => purchaseOrdersApi.issue(id, { remark }), 'Failed to issue purchase order.');
    await invalidate(id);
    return mapPurchaseOrder(record);
  };

  const deletePO = async (id: string) => {
    const result = await withActionError(() => purchaseOrdersApi.delete(id), 'Failed to delete purchase order.');
    await invalidate(id);
    toast.success(result.message || 'Purchase order deleted.');
    return result.success;
  };

  return { createPO, updatePO, submitPO, verifyPO, approvePO, rejectPO, revisePO, issuePO, deletePO };
}

export function usePurchaseOrders(params: PurchaseOrderListParams = {}) {
  const query = useQuery({
    queryKey: purchaseOrderQueryKeys.list(params),
    queryFn: ({ signal }) => purchaseOrdersApi.list({ limit: 100, ...params }, signal),
    staleTime: 15_000,
  });
  const actions = usePurchaseOrderActions();

  return {
    purchaseOrders: query.data?.data ?? [],
    pagination: query.data?.meta ?? { page: 1, pageSize: 100, total: 0, totalPages: 0 },
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    filters: params,
    refetch: query.refetch,
    ...actions,
    markSent: actions.issuePO,
  };
}

export function usePurchaseOrder(id: string | undefined) {
  const query = useQuery({
    queryKey: purchaseOrderQueryKeys.detail(id ?? ''),
    queryFn: ({ signal }) => purchaseOrdersApi.getById(id!, signal),
    enabled: Boolean(id),
    staleTime: 15_000,
  });

  return {
    purchaseOrder: query.data,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}

export function usePurchaseOrderActivity(id: string | undefined) {
  return useQuery<PurchaseOrderRecord[]>({
    queryKey: purchaseOrderQueryKeys.activity(id ?? ''),
    queryFn: ({ signal }) => purchaseOrdersApi.activity(id!, signal),
    enabled: Boolean(id),
    staleTime: 15_000,
  });
}

export function isPurchaseOrderApiStatus(status: string): status is ApiPurchaseOrderStatus {
  return [
    'DRAFT',
    'PENDING_VERIFICATION',
    'PENDING_APPROVAL',
    'APPROVED',
    'REJECTED',
    'PARTIALLY_RECEIVED',
    'COMPLETED',
    'CANCELLED',
  ].includes(status);
}
