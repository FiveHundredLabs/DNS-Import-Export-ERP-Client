import { IInvoiceRepository } from '../IInvoiceRepository';
import { Invoice, InvoiceFilters } from '../../types/invoice';
import { PaginatedResult } from '../../types/common';
import { MOCK_INVOICES } from '../../mock/mockInvoices';

export class MockInvoiceRepository implements IInvoiceRepository {
  private invoices: Invoice[] = [...MOCK_INVOICES];

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

    if (filters?.status && filters.status !== 'ALL') {
      filtered = filtered.filter((inv) => inv.status === filters.status);
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
