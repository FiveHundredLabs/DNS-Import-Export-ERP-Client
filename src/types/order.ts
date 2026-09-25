import { BaseEntity, PaginatedResult } from './common';
import { UserRole } from './auth';

export type OrderStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING_APPROVAL'
  | 'SPECIAL_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'PICKING'
  | 'PARTIALLY_ISSUED'
  | 'ISSUED'
  | 'INVOICED'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'CANCELLED';

/**
 * Historical snapshot of product metadata, pricing, and quantities at order creation time.
 * Price changes in Product Master must never retroactively mutate past orders.
 */
export interface SalesOrderItem {
  id: string;
  productId: string;
  skuSnapshot: string;
  productNameSnapshot: string;
  uomSnapshot?: string;
  unitPriceSnapshot: number;
  discountPercentage: number;
  discountAmount: number;
  taxPercentage: number;
  taxAmount: number;
  lineTotal: number;
  orderedQuantity: number;
  approvedQuantity: number;
  issuedQuantity: number;
  requiresSpecialApproval?: boolean;
  specialApprovalReason?: string;
}

export type OrderActionType =
  | 'CREATE'
  | 'SUBMIT'
  | 'APPROVE'
  | 'REJECT'
  | 'ESCALATE'
  | 'CANCEL'
  | 'PICK'
  | 'ISSUE'
  | 'INVOICE'
  | 'DISPATCH'
  | 'DELIVER';

export interface OrderApprovalAction {
  id: string;
  stepNumber: number;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: OrderActionType;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  comment?: string;
  timestamp: string;
  targetRole?: UserRole;
}

export interface SalesOrder extends BaseEntity {
  orderNumber: string;

  // Quotation linkage (if converted from quotation)
  quotationId?: string;
  quotationNumber?: string;

  // Customer snapshot
  customerId: string;
  customerCodeSnapshot: string;
  customerNameSnapshot: string;
  customerPhoneSnapshot: string;
  customerAddressSnapshot?: string;

  // Credit details at time of order
  customerCreditLimitSnapshot: number;
  customerOutstandingSnapshot: number;
  customerCreditDaysSnapshot: number;
  requestedCreditDays: number;
  creditDaysRequested?: number;
  paymentTerms?: string;

  // Sales rep snapshot
  salesRepId: string;
  salesRepNameSnapshot: string;

  // Delivery & shipping details
  deliveryAddress: string;
  requestedDeliveryDate?: string;
  customerPoNumber?: string;
  notes?: string;

  // Items
  items: SalesOrderItem[];

  // Totals
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;

  // Status & Special Approval indicators
  status: OrderStatus;
  isSpecialApproval: boolean;
  specialApprovalReasons: string[];
  targetApproverRole: 'SALES_MANAGER' | 'MANAGER' | 'DIRECTOR';
  currentApproverRole?: 'SALES_MANAGER' | 'MANAGER' | 'DIRECTOR';
  approvalRequestId?: string;
  approvalHistory: OrderApprovalAction[];

  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;

  rejectedById?: string;
  rejectedByName?: string;
  rejectedAt?: string;
  rejectionReason?: string;

  cancelledById?: string;
  cancelledByName?: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

export interface CreateOrderItemInput {
  productId: string;
  orderedQuantity: number;
  requestedDiscountPercentage?: number;
}

export interface CreateOrderInput {
  customerId: string;
  salesRepId?: string;
  items: CreateOrderItemInput[];
  requestedCreditDays?: number;
  creditDaysRequested?: number;
  deliveryAddress: string;
  requestedDeliveryDate?: string;
  customerPoNumber?: string;
  paymentTerms?: string;
  notes?: string;
  saveAsDraft?: boolean;
  quotationId?: string;
  quotationNumber?: string;
}

export interface UpdateOrderInput {
  customerId?: string;
  items?: CreateOrderItemInput[];
  requestedCreditDays?: number;
  creditDaysRequested?: number;
  deliveryAddress?: string;
  requestedDeliveryDate?: string;
  customerPoNumber?: string;
  paymentTerms?: string;
  notes?: string;
  saveAsDraft?: boolean;
}

export interface OrderFilters {
  status?: OrderStatus | 'ALL';
  customerId?: string;
  salesRepId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  isSpecialApproval?: boolean;
  sortByDate?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface OrderUserContext {
  userId: string;
  role: UserRole;
  areaId?: string;
}
