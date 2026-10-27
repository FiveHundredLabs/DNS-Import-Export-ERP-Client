import { IPurchaseOrderRepository } from '../IPurchaseOrderRepository';
import { PurchaseOrder, PurchaseOrderFilter } from '../../types/purchasing';
import { MOCK_PURCHASE_ORDERS } from '../../mock/mockPurchaseOrders';

const STORAGE_KEY = 'dns_erp_purchase_orders';

export class MockPurchaseOrderRepository implements IPurchaseOrderRepository {
  private purchaseOrders: PurchaseOrder[] = [];

  constructor() {
    this.init();
  }

  private init() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        this.purchaseOrders = JSON.parse(stored);
      } catch {
        this.purchaseOrders = [...MOCK_PURCHASE_ORDERS];
        this.persist();
      }
    } else {
      this.purchaseOrders = [...MOCK_PURCHASE_ORDERS];
      this.persist();
    }
  }

  private persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.purchaseOrders));
  }

  async getAll(filters?: PurchaseOrderFilter): Promise<PurchaseOrder[]> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    let result = [...this.purchaseOrders];

    if (filters) {
      if (filters.status && filters.status !== 'ALL') {
        result = result.filter((po) => po.status === filters.status);
      }
      if (filters.supplierId) {
        result = result.filter((po) => po.supplierId === filters.supplierId);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase().trim();
        result = result.filter(
          (po) =>
            po.poNumber.toLowerCase().includes(q) ||
            po.supplierName.toLowerCase().includes(q) ||
            po.supplierCode.toLowerCase().includes(q) ||
            po.items.some((item) =>
              item.productName.toLowerCase().includes(q) ||
              item.productCode.toLowerCase().includes(q)
            )
        );
      }
      if (filters.startDate) {
        result = result.filter((po) => po.orderDate >= filters.startDate!);
      }
      if (filters.endDate) {
        result = result.filter((po) => po.orderDate <= filters.endDate!);
      }
    }

    // Sort latest first
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getById(id: string): Promise<PurchaseOrder | null> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const po = this.purchaseOrders.find((p) => p.id === id);
    return po ? { ...po } : null;
  }

  async getByPONumber(poNumber: string): Promise<PurchaseOrder | null> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const po = this.purchaseOrders.find(
      (p) => p.poNumber.toLowerCase() === poNumber.toLowerCase()
    );
    return po ? { ...po } : null;
  }

  async create(poData: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<PurchaseOrder> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const now = new Date().toISOString();
    const id = `po-${Date.now().toString().slice(-6)}`;
    const newPO: PurchaseOrder = {
      ...poData,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.purchaseOrders.unshift(newPO);
    this.persist();
    return newPO;
  }

  async update(id: string, updates: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const index = this.purchaseOrders.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error(`Purchase Order ${id} not found.`);
    }

    const updated: PurchaseOrder = {
      ...this.purchaseOrders[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.purchaseOrders[index] = updated;
    this.persist();
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    const index = this.purchaseOrders.findIndex((p) => p.id === id);
    if (index === -1) return false;
    this.purchaseOrders.splice(index, 1);
    this.persist();
    return true;
  }

  async getNextPONumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PO-${year}-`;
    const existingNums = this.purchaseOrders
      .filter((p) => p.poNumber.startsWith(prefix))
      .map((p) => {
        const parts = p.poNumber.split('-');
        return parseInt(parts[parts.length - 1], 10) || 0;
      });
    const max = existingNums.length > 0 ? Math.max(...existingNums) : 0;
    const nextNum = (max + 1).toString().padStart(4, '0');
    return `${prefix}${nextNum}`;
  }

  reset() {
    this.purchaseOrders = [...MOCK_PURCHASE_ORDERS];
    this.persist();
  }
}

export const mockPurchaseOrderRepository = new MockPurchaseOrderRepository();
