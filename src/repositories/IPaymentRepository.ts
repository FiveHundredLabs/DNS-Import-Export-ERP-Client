import { Payment, PaymentFilters } from '../types/payment';
import { PaginatedResult } from '../types/common';

export interface IPaymentRepository {
  getAll(filters?: PaymentFilters): Promise<PaginatedResult<Payment>>;
  getById(id: string): Promise<Payment | null>;
  getByReceiptNumber(receiptNumber: string): Promise<Payment | null>;
  getByCustomerId(customerId: string): Promise<Payment[]>;
  create(payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Payment>;
  update(id: string, updates: Partial<Payment>): Promise<Payment>;
}
