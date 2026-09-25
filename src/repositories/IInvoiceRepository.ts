import { Invoice, InvoiceFilters } from '../types/invoice';
import { PaginatedResult } from '../types/common';

export interface IInvoiceRepository {
  getAll(filters?: InvoiceFilters): Promise<PaginatedResult<Invoice>>;
  getById(id: string): Promise<Invoice | null>;
  getByInvoiceNumber(invoiceNumber: string): Promise<Invoice | null>;
  getByOrderId(orderId: string): Promise<Invoice[]>;
  getByCustomerId(customerId: string): Promise<Invoice[]>;
  create(invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice>;
  update(id: string, updates: Partial<Invoice>): Promise<Invoice>;
}
