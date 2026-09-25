import { IPaymentRepository } from '../IPaymentRepository';
import { Payment, PaymentFilters } from '../../types/payment';
import { PaginatedResult } from '../../types/common';
import { MOCK_PAYMENTS } from '../../mock/mockPayments';

export class MockPaymentRepository implements IPaymentRepository {
  private payments: Payment[] = [...MOCK_PAYMENTS];

  async getAll(filters?: PaymentFilters): Promise<PaginatedResult<Payment>> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    let filtered = [...this.payments];

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.receiptNumber.toLowerCase().includes(q) ||
          p.customerName.toLowerCase().includes(q) ||
          (p.customerCode && p.customerCode.toLowerCase().includes(q)) ||
          (p.chequeNumber && p.chequeNumber.toLowerCase().includes(q))
      );
    }

    if (filters?.status && filters.status !== 'ALL') {
      filtered = filtered.filter((p) => p.status === filters.status);
    }

    if (filters?.paymentMethod && filters.paymentMethod !== 'ALL') {
      filtered = filtered.filter((p) => p.paymentMethod === filters.paymentMethod);
    }

    if (filters?.customerId) {
      filtered = filtered.filter((p) => p.customerId === filters.customerId);
    }

    if (filters?.salesRepId) {
      filtered = filtered.filter((p) => p.salesRepId === filters.salesRepId);
    }

    if (filters?.startDate) {
      filtered = filtered.filter((p) => p.collectedAt >= filters.startDate!);
    }

    if (filters?.endDate) {
      filtered = filtered.filter((p) => p.collectedAt <= filters.endDate!);
    }

    filtered.sort((a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime());

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

  async getById(id: string): Promise<Payment | null> {
    await new Promise((resolve) => setTimeout(resolve, 30));
    const p = this.payments.find((item) => item.id === id);
    return p ? { ...p } : null;
  }

  async getByReceiptNumber(receiptNumber: string): Promise<Payment | null> {
    await new Promise((resolve) => setTimeout(resolve, 30));
    const p = this.payments.find((item) => item.receiptNumber.toLowerCase() === receiptNumber.toLowerCase());
    return p ? { ...p } : null;
  }

  async getByCustomerId(customerId: string): Promise<Payment[]> {
    await new Promise((resolve) => setTimeout(resolve, 30));
    return this.payments.filter((p) => p.customerId === customerId).map((p) => ({ ...p }));
  }

  async create(paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Payment> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const now = new Date().toISOString();
    const newPayment: Payment = {
      ...paymentData,
      id: `pay-${Date.now().toString().slice(-6)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.payments.unshift(newPayment);
    return { ...newPayment };
  }

  async update(id: string, updates: Partial<Payment>): Promise<Payment> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const idx = this.payments.findIndex((p) => p.id === id);
    if (idx === -1) {
      throw new Error(`Payment with ID ${id} not found.`);
    }

    const updated: Payment = {
      ...this.payments[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.payments[idx] = updated;
    return { ...updated };
  }
}
