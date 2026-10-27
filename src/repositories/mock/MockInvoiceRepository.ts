import { IInvoiceRepository } from '../IInvoiceRepository';
import { Invoice, InvoiceFilters } from '../../types/invoice';
import { PaginatedResult } from '../../types/common';
import { MOCK_INVOICES } from '../../mock/mockInvoices';

export class MockInvoiceRepository implements IInvoiceRepository {
  private invoices: Invoice[] = JSON.parse(JSON.stringify(MOCK_INVOICES));

  resetToDefaults(): void {
    this.invoices = JSON.parse(JSON.stringify(MOCK_INVOICES));
  }

  async getAll(filters?: InvoiceFilters): Promise<PaginatedResult<Invoice>> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    let filtered = [...this.invoices];

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.orderNumber.toLowerCase().includes(q) ||
          inv.customerName.toLowerCase().includes(q) ||
          inv.customerCode.toLowerCase().includes(q)
      );
    }

    const effectiveFilter = filters?.paymentFilter || filters?.status;
    if (effectiveFilter && effectiveFilter !== 'ALL') {
      const now = new Date();
      const sevenDaysAheadTime = now.getTime() + 7 * 24 * 60 * 60 * 1000;

      filtered = filtered.filter((inv) => {
        if (
          [
            'DRAFT',
            'ISSUED',
            'COLLECTED',
            'PARTIALLY_COLLECTED',
            'PAID',
            'PARTIALLY_PAID',
            'CANCELLED',
          ].includes(effectiveFilter)
        ) {
          return inv.status === effectiveFilter;
        }

        const uncollected = Math.max(0, inv.balanceAmount - (inv.collectedAmount || 0));
        const [y, m, d] = inv.dueDate.split('-').map(Number);
        const dueTime = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
        const isOverdue = dueTime < now.getTime() || inv.status === 'OVERDUE';
        const isNearDue = !isOverdue && dueTime <= sevenDaysAheadTime && uncollected > 0;

        switch (effectiveFilter) {
          case 'OUTSTANDING':
            return inv.balanceAmount > 0;
          case 'OVERDUE':
            return isOverdue && uncollected > 0;
          case 'NEARBY':
          case 'NEAR_DUE':
            return isNearDue;
          case 'PENDING_COLLECTION':
            return (
              inv.status === 'COLLECTED' ||
              inv.status === 'PARTIALLY_COLLECTED' ||
              ((inv.collectedAmount || 0) > 0 && inv.status !== 'PAID')
            );
          case 'SETTLED':
          case 'FULLY_SETTLED':
            return inv.status === 'PAID' || inv.balanceAmount <= 0;
          default:
            return true;
        }
      });
    }

    if (filters?.customerId) {
      filtered = filtered.filter((inv) => inv.customerId === filters.customerId);
    }

    if (filters?.salesRepId) {
      filtered = filtered.filter((inv) => inv.salesRepId === filters.salesRepId);
    }

    if (filters?.startDate) {
      filtered = filtered.filter((inv) => inv.issueDate >= filters.startDate!);
    }

    if (filters?.endDate) {
      filtered = filtered.filter((inv) => inv.issueDate <= filters.endDate!);
    }

    // Sort descending by issueDate / createdAt
    filtered.sort((a, b) => new Date(b.issueDate || b.createdAt).getTime() - new Date(a.issueDate || a.createdAt).getTime());

    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 10;
    const startIndex = (page - 1) * pageSize;
    const paginated = filtered.slice(startIndex, startIndex + pageSize);

    return {
      data: paginated,
      total: filtered.length,
      page,
      pageSize,
      totalPages: Math.ceil(filtered.length / pageSize),
    };
  }

  async getById(id: string): Promise<Invoice | null> {
    await new Promise((resolve) => setTimeout(resolve, 30));
    const inv = this.invoices.find((i) => i.id === id);
    return inv ? { ...inv } : null;
  }

  async getByInvoiceNumber(invoiceNumber: string): Promise<Invoice | null> {
    await new Promise((resolve) => setTimeout(resolve, 30));
    const inv = this.invoices.find((i) => i.invoiceNumber.toLowerCase() === invoiceNumber.toLowerCase());
    return inv ? { ...inv } : null;
  }

  async getByOrderId(orderId: string): Promise<Invoice[]> {
    await new Promise((resolve) => setTimeout(resolve, 30));
    return this.invoices.filter((i) => i.orderId === orderId).map((i) => ({ ...i }));
  }

  async getByCustomerId(customerId: string): Promise<Invoice[]> {
    await new Promise((resolve) => setTimeout(resolve, 30));
    return this.invoices.filter((i) => i.customerId === customerId).map((i) => ({ ...i }));
  }

  async create(invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const now = new Date().toISOString();
    const newInvoice: Invoice = {
      ...invoiceData,
      id: `inv-${Date.now().toString().slice(-6)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.invoices.unshift(newInvoice);
    return { ...newInvoice };
  }

  async update(id: string, updates: Partial<Invoice>): Promise<Invoice> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const idx = this.invoices.findIndex((i) => i.id === id);
    if (idx === -1) {
      throw new Error(`Invoice with ID ${id} not found.`);
    }

    const updated: Invoice = {
      ...this.invoices[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.invoices[idx] = updated;
    return { ...updated };
  }
}
