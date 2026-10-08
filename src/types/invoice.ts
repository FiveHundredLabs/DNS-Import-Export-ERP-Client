import { BaseEntity } from './common';

export type InvoiceStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'COLLECTED'
  | 'PARTIALLY_COLLECTED'
  | 'PAID'
  | 'PARTIALLY_PAID'
  | 'OVERDUE'
  | 'CANCELLED';

export interface InvoiceItem {
  id: string;
  productId: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  unitPriceSnapshot: number;
  discountPercentage: number;
  discountAmount?: number;
  taxPercentage: number;
  taxAmount?: number;
  lineTotal: number;
  quantity: number;
  uomSnapshot?: string;
  discountApprovalStatus?: 'NOT_REQUIRED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  discountAllowedPercentage?: number;
  discountApprovedById?: string;
  discountApprovedByName?: string;
  discountApprovedAt?: string;
  discountApprovalNote?: string;
}

export interface Invoice extends BaseEntity {
  invoiceNumber: string; // e.g. INV-2025-0001
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerCode: string;
  customerAddress?: string;
  customerPhone?: string;
  customerVatNumber?: string;
  salesRepId: string;
  salesRepName: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  items: InvoiceItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  totalAmount: number;
  taxEnabled?: boolean;
  taxRatePercentage?: number;
  paidAmount: number;
  collectedAmount?: number;
  balanceAmount: number;
  status: InvoiceStatus;
  notes?: string;
  paymentTerms?: string;
}

export interface InvoiceFilters {
  status?: InvoiceStatus | 'ALL';
  customerId?: string;
  salesRepId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}
