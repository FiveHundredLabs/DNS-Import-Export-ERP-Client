import { BaseEntity } from './common';

export type PaymentStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export type PaymentMethod = 'CASH' | 'CHEQUE' | 'BANK_TRANSFER';

export interface PaymentAllocation {
  invoiceId: string;
  invoiceNumber: string;
  allocatedAmount: number;
}

export interface ChequeDetails {
  chequeNumber: string;
  chequeDate: string; // YYYY-MM-DD
  bankName: string;
  clearingDate?: string;
  isCleared?: boolean;
}

export interface Payment extends BaseEntity {
  receiptNumber: string; // e.g. REC-2025-0001
  customerId: string;
  customerName: string;
  customerCode?: string;
  salesRepId: string;
  salesRepName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  chequeNumber?: string;
  chequeDate?: string;
  bankName?: string;
  chequeDetails?: ChequeDetails;
  invoiceAllocations: PaymentAllocation[];
  notes?: string;
  collectedAt: string; // ISO date string
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  rejectedById?: string;
  rejectedByName?: string;
  rejectedAt?: string;
}

export interface CreatePaymentInput {
  customerId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  chequeNumber?: string;
  chequeDate?: string;
  bankName?: string;
  invoiceAllocations?: PaymentAllocation[];
  notes?: string;
}

export interface PaymentFilters {
  status?: PaymentStatus | 'ALL';
  paymentMethod?: PaymentMethod | 'ALL';
  customerId?: string;
  salesRepId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}
