import { useState, useEffect, useCallback } from 'react';
import { PurchaseOrder, PurchaseOrderFilter, CreatePurchaseOrderDTO } from '../types/purchasing';
import { purchaseOrderService } from '../services/PurchaseOrderService';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function usePurchaseOrders(initialFilters?: PurchaseOrderFilter) {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PurchaseOrderFilter>(initialFilters || {});
  const { currentUser } = useAuth();

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await purchaseOrderService.getAll(filters);
      setPurchaseOrders(data);
    } catch (err: any) {
      const msg = err.message || 'Failed to load purchase orders';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const createPO = async (dto: CreatePurchaseOrderDTO): Promise<PurchaseOrder> => {
    try {
      const po = await purchaseOrderService.createPurchaseOrder(dto, currentUser);
      toast.success(
        dto.submitForApproval
          ? `Purchase Order ${po.poNumber} created and submitted for approval.`
          : `Purchase Order ${po.poNumber} saved as draft.`
      );
      await fetchOrders();
      return po;
    } catch (err: any) {
      const msg = err.message || 'Failed to create purchase order';
      toast.error(msg);
      throw err;
    }
  };

  const updatePO = async (id: string, dto: Partial<CreatePurchaseOrderDTO>): Promise<PurchaseOrder> => {
    try {
      const po = await purchaseOrderService.updatePurchaseOrder(id, dto, currentUser);
      toast.success(`Purchase Order ${po.poNumber} updated successfully.`);
      await fetchOrders();
      return po;
    } catch (err: any) {
      const msg = err.message || 'Failed to update purchase order';
      toast.error(msg);
      throw err;
    }
  };

  const submitPO = async (id: string): Promise<PurchaseOrder> => {
    try {
      const po = await purchaseOrderService.submitForApproval(id, currentUser);
      toast.success(`Purchase Order ${po.poNumber} submitted for internal approval.`);
      await fetchOrders();
      return po;
    } catch (err: any) {
      const msg = err.message || 'Failed to submit purchase order';
      toast.error(msg);
      throw err;
    }
  };

  const markSent = async (id: string): Promise<PurchaseOrder> => {
    try {
      const po = await purchaseOrderService.markAsSentToSupplier(id, currentUser);
      toast.success(`Purchase Order ${po.poNumber} marked as sent to supplier.`);
      await fetchOrders();
      return po;
    } catch (err: any) {
      const msg = err.message || 'Failed to mark PO as sent';
      toast.error(msg);
      throw err;
    }
  };

  const deletePO = async (id: string): Promise<boolean> => {
    try {
      const success = await purchaseOrderService.deletePurchaseOrder(id);
      if (success) {
        toast.success('Draft purchase order deleted.');
        await fetchOrders();
      }
      return success;
    } catch (err: any) {
      const msg = err.message || 'Failed to delete purchase order';
      toast.error(msg);
      throw err;
    }
  };

  return {
    purchaseOrders,
    loading,
    error,
    filters,
    setFilters,
    refetch: fetchOrders,
    createPO,
    updatePO,
    submitPO,
    markSent,
    deletePO,
  };
}
