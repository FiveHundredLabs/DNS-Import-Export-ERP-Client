import { BaseEntity } from './common';
import { PaymentAllocation, PaymentMethod } from './payment';

export type HandoverStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface CashHandoverItem {
  paymentId: string;
  receiptNumber: string;
  customerId: string;
  customerName: string;
  customerCode?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  collectedAt: string;
  invoiceAllocations: PaymentAllocation[];
}

export interface CashHandover extends BaseEntity {
  handoverNumber: string; // e.g. HND-2026-0001
  salesRepId: string;
  salesRepName: string;
  salesRepEmail?: string;
  recipientUserId: string; // Finance user receiving the money
  recipientUserName: string;
  recipientUserRole: string; // e.g. "Finance Officer" / "Finance Manager"
  totalAmount: number;
  customerCount: number;
  invoiceCount: number;
  status: HandoverStatus;
  submittedAt: string;
  approvedAt?: string;
  approvedById?: string;
  approvedByName?: string;
  approvalComment?: string;
  rejectionReason?: string;
  rejectedAt?: string;
  rejectedById?: string;
  rejectedByName?: string;
  notes?: string;
  items: CashHandoverItem[];
}

export interface CreateHandoverInput {
  recipientUserId: string;
  paymentIds: string[];
  notes?: string;
}

export interface HandoverFilters {
  salesRepId?: string;
  recipientUserId?: string;
  status?: HandoverStatus | 'ALL';
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface DailyHandoverMetrics {
  todayTotalCollected: number;
  pendingHandover: number;
  handedOver: number;
  approvedByFinance: number;
}
