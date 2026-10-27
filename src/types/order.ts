import { BaseEntity } from './common';
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
  batchId?: string;
  batchNumber?: string;
  requiresSpecialApproval?: boolean;
  specialApprovalReason?: string;
  discountApprovalStatus?: 'NOT_REQUIRED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  discountAllowedPercentage?: number;
  discountApprovedById?: string;
  discountApprovedByName?: string;
  discountApprovedAt?: string;
  discountApprovalNote?: string;
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

export type OrderActivityType =
  | 'ORDER_CREATED'
  | 'SUBMITTED_FOR_APPROVAL'
  | 'APPROVAL_ASSIGNED'
  | 'APPROVAL_ESCALATED'
  | 'PRODUCT_MODIFIED'
  | 'ORDER_APPROVED'
  | 'ORDER_REJECTED'
  | 'STOCK_RESERVED'
  | 'DELIVERY_NOTE_CREATED'
  | 'DISPATCH_INITIATED'
  | 'DISPATCH_UPDATED'
  | 'PRODUCT_RETURNED'
  | 'REPLACEMENT_DISPATCHED'
  | 'DELIVERED'
  | 'INVOICE_ISSUED'
  | 'ORDER_CANCELLED';

export interface OrderProductModificationDetail {
  added?: Array<{
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  modified?: Array<{
    productId: string;
    productName: string;
    sku: string;
    previousQuantity: number;
    newQuantity: number;
    unitPrice: number;
    delta: number;
  }>;
  removed?: Array<{
    productId: string;
    productName: string;
    sku: string;
    previousQuantity: number;
    unitPrice: number;
  }>;
  reason?: string;
}

export interface StockReservationDetail {
  productId: string;
  productName: string;
  sku: string;
  reservedQuantity: number;
  warehouseName?: string;
  reservedAt?: string;
}

export interface DeliveryNoteDetail {
  deliveryNoteNumber: string;
  items: Array<{
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
  }>;
  stockKeeperId: string;
  stockKeeperName: string;
  createdAt: string;
}

export interface DispatchDetail {
  dispatchNumber: string;
  deliveryNoteNumber: string;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  dispatchedAt: string;
  stockKeeperId: string;
  stockKeeperName: string;
  status: 'PREPARED' | 'DISPATCHED' | 'IN_TRANSIT' | 'PARTIALLY_DELIVERED' | 'DELIVERED';
  notes?: string;
}

export interface ProductReturnDetail {
  productId: string;
  productName: string;
  sku: string;
  returnedQuantity: number;
  reason: string;
  recordedById: string;
  recordedByName: string;
  recordedByRole: string;
  recordedAt: string;
}

export interface ReplacementDispatchDetail {
  replacementDeliveryNoteNumber: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  stockKeeperId: string;
  stockKeeperName: string;
  dispatchedAt: string;
  originalReturnReason?: string;
  notes?: string;
}

export interface InvoiceIssuanceDetail {
  invoiceId?: string;
  invoiceNumber: string;
  totalAmount: number;
  issuedAt: string;
  issuedByName: string;
}

export interface OrderActivityEvent {
  id: string;
  orderId?: string;
  orderNumber?: string;
  type: OrderActivityType;
  title: string;
  description?: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole | string;
  timestamp: string;
  statusBadge?: {
    label: string;
    variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'amber';
  };
  currentApproverRole?: UserRole | string;
  currentApproverName?: string;
  targetApproverRole?: UserRole | string;
  targetApproverName?: string;
  productChanges?: OrderProductModificationDetail;
  stockReservations?: StockReservationDetail[];
  deliveryNote?: DeliveryNoteDetail;
  dispatchDetails?: DispatchDetail;
  returnDetails?: ProductReturnDetail;
  replacementDetails?: ReplacementDispatchDetail;
  invoiceDetails?: InvoiceIssuanceDetail;
  comment?: string;
  documentReference?: string;
  notes?: string;
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
  taxEnabled?: boolean;
  taxRatePercentage?: number;

  // Status & Special Approval indicators
  status: OrderStatus;
  isSpecialApproval: boolean;
  specialApprovalReasons: string[];
  targetApproverRole: 'SALES_MANAGER' | 'MANAGER' | 'DIRECTOR';
  currentApproverRole?: 'SALES_MANAGER' | 'MANAGER' | 'DIRECTOR';
  currentApprovalOwnerRole?: UserRole | string;
  currentApprovalOwnerName?: string;
  approvalRequestId?: string;
  approvalHistory: OrderApprovalAction[];
  activityLog?: OrderActivityEvent[];

  deliveryNoteNumber?: string;
  invoiceNumber?: string;
  invoiceId?: string;

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
  batchId?: string;
  batchNumber?: string;
  unitPrice?: number;
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
