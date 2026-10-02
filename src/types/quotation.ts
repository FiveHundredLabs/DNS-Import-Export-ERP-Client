import { BaseEntity } from './common';

export type QuotationStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'CONVERTED'
  | 'EXPIRED';

/**
 * Historical snapshot of product pricing and metadata at quotation time.
 * Section 3 & Domain Model: Price changes to Product Master must never
 * retroactively mutate past quotations or converted orders.
 */
export interface QuotationItem {
  id: string;
  productId: string;
  skuSnapshot: string;
  productNameSnapshot: string;
  uomSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  discountPercentage: number;
  discountAmount: number;
  taxPercentage: number;
  taxAmount: number;
  lineTotal: number;
  requiresApproval?: boolean;
  approvalReason?: string;
}

export interface Quotation extends BaseEntity {
  quotationNumber: string;
  customerId: string;
  customerCodeSnapshot: string;
  customerNameSnapshot: string;
  customerPhoneSnapshot: string;
  customerAddressSnapshot?: string;
  salesRepId: string;
  salesRepNameSnapshot: string;
  items: QuotationItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  status: QuotationStatus;
  validUntil: string;
  notes?: string;
  termsAndConditions?: string;
  requiresApproval: boolean;
  approvalReason?: string;
  approvalRequestId?: string;
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectedById?: string;
  rejectedByName?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  convertedToOrderId?: string;
  convertedOrderNumber?: string;
  convertedAt?: string;
}

export interface QuotationFilters {
  status?: QuotationStatus | 'ALL';
  customerId?: string;
  salesRepId?: string;
  search?: string;
  sortByDate?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface CreateQuotationItemInput {
  productId: string;
  quantity: number;
  requestedDiscountPercentage?: number;
}

export interface CreateQuotationInput {
  customerId: string;
  salesRepId: string;
  items: CreateQuotationItemInput[];
  validDays?: number;
  validUntil?: string;
  notes?: string;
  termsAndConditions?: string;
  saveAsDraft?: boolean;
}

export interface UpdateQuotationInput {
  customerId?: string;
  items?: CreateQuotationItemInput[];
  validUntil?: string;
  notes?: string;
  termsAndConditions?: string;
  saveAsDraft?: boolean;
}

export interface ConvertedOrderPayload {
  orderNumber: string;
  quotationId: string;
  quotationNumber: string;
  customerId: string;
  customerNameSnapshot: string;
  salesRepId: string;
  salesRepNameSnapshot: string;
  items: QuotationItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  deliveryAddress?: string;
  deliveryDate?: string;
  customerPoNumber?: string;
  convertedAt: string;
}
