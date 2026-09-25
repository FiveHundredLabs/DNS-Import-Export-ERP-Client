import { useState, useEffect, useCallback } from 'react';
import {
  SalesOrder,
  OrderFilters,
  CreateOrderInput,
  UpdateOrderInput,
  OrderStatus,
} from '../types/order';
import { orderService } from '../services/OrderService';
import { useAuth } from './useAuth';

export function useOrders(initialFilters?: OrderFilters) {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<OrderFilters>(
    initialFilters || { page: 1, pageSize: 20, status: 'ALL', sortByDate: 'desc' }
  );
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await orderService.listOrders(filters, {
        userId: currentUser.id,
        role: currentUser.role,
        areaId: currentUser.areaId,
      });
      setOrders(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sales orders');
    } finally {
      setLoading(false);
    }
  }, [filters, currentUser]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const createOrder = async (input: CreateOrderInput): Promise<SalesOrder> => {
    const created = await orderService.createOrder(input, currentUser);
    await fetchOrders();
    return created;
  };

  const updateOrder = async (
    id: string,
    updates: UpdateOrderInput
  ): Promise<SalesOrder> => {
    const updated = await orderService.updateOrder(id, updates, currentUser);
    await fetchOrders();
    return updated;
  };

  const submitOrder = async (id: string, note?: string): Promise<SalesOrder> => {
    const submitted = await orderService.submitOrder(id, currentUser, note);
    await fetchOrders();
    return submitted;
  };

  const approveOrder = async (id: string, comment: string): Promise<SalesOrder> => {
    const approved = await orderService.approveOrder(id, currentUser, comment);
    await fetchOrders();
    return approved;
  };

  const rejectOrder = async (id: string, reason: string): Promise<SalesOrder> => {
    const rejected = await orderService.rejectOrder(id, currentUser, reason);
    await fetchOrders();
    return rejected;
  };

  const escalateOrder = async (
    id: string,
    targetRole: 'MANAGER' | 'DIRECTOR',
    comment: string
  ): Promise<SalesOrder> => {
    const escalated = await orderService.escalateOrder(id, currentUser, targetRole, comment);
    await fetchOrders();
    return escalated;
  };

  const cancelOrder = async (id: string, reason: string): Promise<SalesOrder> => {
    const cancelled = await orderService.cancelOrder(id, currentUser, reason);
    await fetchOrders();
    return cancelled;
  };

  const updateFulfillmentStatus = async (
    id: string,
    nextStatus: OrderStatus,
    details?: { issuedQuantities?: Record<string, number>; comment?: string }
  ): Promise<SalesOrder> => {
    const updated = await orderService.updateFulfillmentStatus(
      id,
      nextStatus,
      currentUser,
      details
    );
    await fetchOrders();
    return updated;
  };

  const createFromQuotation = async (
    quotationId: string,
    options?: {
      deliveryAddress?: string;
      deliveryDate?: string;
      requestedCreditDays?: number;
      customerPoNumber?: string;
      notes?: string;
      saveAsDraft?: boolean;
    }
  ): Promise<SalesOrder> => {
    const created = await orderService.createFromQuotation(
      quotationId,
      currentUser,
      options
    );
    await fetchOrders();
    return created;
  };

  return {
    orders,
    loading,
    error,
    filters,
    setFilters,
    total,
    totalPages,
    fetchOrders,
    createOrder,
    updateOrder,
    submitOrder,
    approveOrder,
    rejectOrder,
    escalateOrder,
    cancelOrder,
    updateFulfillmentStatus,
    createFromQuotation,
  };
}
