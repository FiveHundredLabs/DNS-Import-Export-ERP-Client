import { ISalesOrderRepository } from '../ISalesOrderRepository';
import { SalesOrder, OrderFilters, OrderUserContext } from '../../types/order';
import { PaginatedResult } from '../../types/common';
import { MOCK_ORDERS } from '../../mock/mockOrders';

export class MockSalesOrderRepository implements ISalesOrderRepository {
  private orders: SalesOrder[] = JSON.parse(JSON.stringify(MOCK_ORDERS));

  async getAll(
    filters?: OrderFilters,
    userContext?: OrderUserContext
  ): Promise<PaginatedResult<SalesOrder>> {
    await new Promise((resolve) => setTimeout(resolve, 60));

    let result = [...this.orders];

    // Territory scoping: Sales Rep only sees orders assigned to their user ID
    if (userContext?.role === 'SALES_REP') {
      result = result.filter((o) => o.salesRepId === userContext.userId);
    }

    if (filters?.status && filters.status !== 'ALL') {
      result = result.filter((o) => o.status === filters.status);
    }

    if (filters?.customerId) {
      result = result.filter((o) => o.customerId === filters.customerId);
    }

    if (filters?.salesRepId) {
      result = result.filter((o) => o.salesRepId === filters.salesRepId);
    }

    if (filters?.isSpecialApproval !== undefined) {
      result = result.filter((o) => o.isSpecialApproval === filters.isSpecialApproval);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerNameSnapshot.toLowerCase().includes(q) ||
          o.customerCodeSnapshot.toLowerCase().includes(q)
      );
    }

    if (filters?.startDate) {
      result = result.filter((o) => (o.createdAt.split('T')[0] || o.createdAt) >= filters.startDate!);
    }

    if (filters?.endDate) {
      result = result.filter((o) => (o.createdAt.split('T')[0] || o.createdAt) <= filters.endDate!);
    }

    // Sort by createdAt
    const sortOrder = filters?.sortByDate || 'desc';
    result.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;
    const total = result.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const startIdx = (page - 1) * pageSize;
    const paginatedData = result.slice(startIdx, startIdx + pageSize);

    return {
      data: paginatedData,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async getById(id: string): Promise<SalesOrder | null> {
    await new Promise((resolve) => setTimeout(resolve, 40));
    const order = this.orders.find((o) => o.id === id);
    return order ? JSON.parse(JSON.stringify(order)) : null;
  }

  async create(
    order: Omit<SalesOrder, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<SalesOrder> {
    await new Promise((resolve) => setTimeout(resolve, 60));
    const now = new Date().toISOString();
    const newOrder: SalesOrder = {
      ...order,
      id: `ord-${Date.now().toString().slice(-6)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.orders.unshift(newOrder);
    return JSON.parse(JSON.stringify(newOrder));
  }

  async update(id: string, updates: Partial<SalesOrder>): Promise<SalesOrder> {
    await new Promise((resolve) => setTimeout(resolve, 60));
    const idx = this.orders.findIndex((o) => o.id === id);
    if (idx === -1) {
      throw new Error(`Sales Order not found: ${id}`);
    }

    const updated: SalesOrder = {
      ...this.orders[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.orders[idx] = updated;
    return JSON.parse(JSON.stringify(updated));
  }

  async delete(id: string): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 40));
    const idx = this.orders.findIndex((o) => o.id === id);
    if (idx === -1) return false;
    this.orders.splice(idx, 1);
    return true;
  }
}
