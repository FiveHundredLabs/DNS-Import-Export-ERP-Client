import { ISalesOrderRepository } from '../ISalesOrderRepository';
import { SalesOrder, OrderFilters, OrderUserContext } from '../../types/order';
import { PaginatedResult } from '../../types/common';
import { MOCK_ORDERS } from '../../mock/mockOrders';
import { MOCK_APPROVALS } from '../../mock/mockApprovals';

const SALES_ORDERS_STORAGE_KEY = 'dns_erp_sales_orders_v2';

export class MockSalesOrderRepository implements ISalesOrderRepository {
  private orders: SalesOrder[] = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(SALES_ORDERS_STORAGE_KEY);
        if (stored) {
          const parsed: SalesOrder[] = JSON.parse(stored);
          const existingIds = new Set(parsed.map((o) => o.id));
          const missing = MOCK_ORDERS.filter((o) => !existingIds.has(o.id));
          this.orders = [...parsed, ...JSON.parse(JSON.stringify(missing))];
          if (missing.length > 0) {
            this.persist();
          }
        } else {
          this.orders = JSON.parse(JSON.stringify(MOCK_ORDERS));
          this.persist();
        }
      } else {
        this.orders = JSON.parse(JSON.stringify(MOCK_ORDERS));
      }
    } catch {
      this.orders = JSON.parse(JSON.stringify(MOCK_ORDERS));
    }
  }

  private persist(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(SALES_ORDERS_STORAGE_KEY, JSON.stringify(this.orders));
      }
    } catch {}
  }

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
    let order = this.orders.find((o) => o.id === id || o.orderNumber === id);
    if (order) return JSON.parse(JSON.stringify(order));

    // Fallback 1: check MOCK_ORDERS directly
    const mockOrder = MOCK_ORDERS.find((o) => o.id === id || o.orderNumber === id);
    if (mockOrder) {
      this.orders.push(JSON.parse(JSON.stringify(mockOrder)));
      this.persist();
      return JSON.parse(JSON.stringify(mockOrder));
    }

    // Fallback 2: check if an approval request exists for this documentId or reference
    const approval = MOCK_APPROVALS.find(
      (a) =>
        (a.documentType === 'SALES_ORDER' || a.documentType === 'SPECIAL_SALES_ORDER') &&
        (a.documentId === id || a.documentReferenceNumber === id)
    );
    if (approval) {
      const fallbackOrder: SalesOrder = {
        id: approval.documentId,
        orderNumber: approval.documentReferenceNumber,
        customerId: 'cust-002',
        customerCodeSnapshot: 'DLR-NEG-002',
        customerNameSnapshot: 'Muthurajawela Engineering',
        customerPhoneSnapshot: '+94 31 223 4567',
        customerAddressSnapshot: '89 Main Street, Negombo',
        customerCreditLimitSnapshot: 1500000,
        customerOutstandingSnapshot: 1250000,
        customerCreditDaysSnapshot: 30,
        requestedCreditDays: 45,
        paymentTerms: '45 Days Extended PDC',
        salesRepId: approval.initiatorId || 'usr-106',
        salesRepNameSnapshot: approval.initiatorName || 'Kasun Wickramasinghe',
        deliveryAddress: 'Project Site Delivery Address',
        requestedDeliveryDate: '2026-12-15',
        customerPoNumber: `PO-${approval.documentReferenceNumber}`,
        notes: approval.description,
        items: [
          {
            id: `item-${approval.documentId}-1`,
            productId: 'prod-002',
            skuSnapshot: 'DNS-MCB-63A-3P',
            productNameSnapshot: 'Schneider Acti9 63A Triple Pole MCB',
            uomSnapshot: 'PCS',
            unitPriceSnapshot: 8400,
            discountPercentage: 10,
            discountAmount: 42000,
            taxPercentage: 18,
            taxAmount: 68040,
            lineTotal: 446040,
            orderedQuantity: 50,
            approvedQuantity: 50,
            issuedQuantity: 0,
            requiresSpecialApproval: approval.isSpecialScenario,
            specialApprovalReason: approval.specialReason,
          },
        ],
        subtotal: 420000,
        discountAmount: 42000,
        taxAmount: 68040,
        totalAmount: 446040,
        status: approval.isSpecialScenario ? 'SPECIAL_APPROVAL' : 'PENDING_APPROVAL',
        isSpecialApproval: approval.isSpecialScenario,
        specialApprovalReasons: approval.specialReason ? [approval.specialReason] : [],
        targetApproverRole: approval.targetApproverRole || approval.currentApproverRole || 'SALES_MANAGER',
        currentApproverRole: approval.currentApproverRole,
        approvalRequestId: approval.id,
        approvalHistory: approval.history.map((h) => ({
          id: h.id,
          stepNumber: h.stepNumber,
          actorId: h.actorId,
          actorName: h.actorName,
          actorRole: h.actorRole,
          action: h.action === 'APPROVE' ? 'APPROVE' : h.action === 'ESCALATE' ? 'FORWARD' : 'SUBMIT',
          fromStatus: 'DRAFT',
          toStatus: approval.isSpecialScenario ? 'SPECIAL_APPROVAL' : 'PENDING_APPROVAL',
          comment: h.comment,
          timestamp: h.timestamp,
        })),
        createdAt: approval.createdAt,
        updatedAt: approval.updatedAt,
      };
      this.orders.push(fallbackOrder);
      this.persist();
      return JSON.parse(JSON.stringify(fallbackOrder));
    }

    return null;
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
    this.persist();
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
    this.persist();
    return JSON.parse(JSON.stringify(updated));
  }

  async delete(id: string): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 40));
    const idx = this.orders.findIndex((o) => o.id === id);
    if (idx === -1) return false;
    this.orders.splice(idx, 1);
    this.persist();
    return true;
  }
}
