import type { PurchaseOrder, PurchaseOrderStatus } from '../../types/purchasing';
import type { DiscountType } from './purchase-orders.constants';

export type ApiPurchaseOrderStatus =
  | 'DRAFT'
  | 'PENDING_VERIFICATION'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'PARTIALLY_RECEIVED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface PurchaseOrderSupplier {
  id: string;
  supplierCode?: string | null;
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  taxNumber?: string | null;
  vatNumber?: string | null;
}

export interface PurchaseOrderProduct {
  id: string;
  sku: string;
  name: string;
  unitOfMeasure?: string | null;
  costPrice?: string | number | null;
}

export interface PurchaseOrderItemRecord {
  id: string;
  productId: string;
  qty: number;
  receivedQty: number;
  unitPrice: string | number;
  discountType: DiscountType | null;
  discountValue?: string | number;
  discountAmount: string | number;
  totalPrice: string | number;
  notes?: string | null;
  product?: PurchaseOrderProduct;
}

export interface PurchaseOrderRecord {
  id: string;
  actionType: string;
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  remark?: string | null;
  createdAt: string;
}

export interface PurchaseOrderApiRecord {
  id: string;
  poNumber: string;
  supplierId: string;
  supplier: PurchaseOrderSupplier;
  paymentTerms?: string | null;
  orderDate: string;
  expectedDeliveryDate?: string | null;
  note?: string | null;
  deliveryInstructions?: string | null;
  status: ApiPurchaseOrderStatus;
  totalDiscountType?: DiscountType | null;
  totalDiscountValue?: string | number;
  totalDiscount: string | number;
  subtotal: string | number;
  totalAmount: string | number;
  createdById: string;
  createdByRole?: string | null;
  creator?: { id: string; fullName?: string | null; email: string };
  verifyBy?: string | null;
  verifyAt?: string | null;
  verifyRemarks?: string | null;
  stage1Bypassed: boolean;
  verifier?: { id: string; fullName?: string | null; email: string } | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  approvalRemarks?: string | null;
  approver?: { id: string; fullName?: string | null; email: string } | null;
  issueAt?: string | null;
  rejectionReason?: string | null;
  revisedFromPoId?: string | null;
  createdAt: string;
  updatedAt: string;
  items: PurchaseOrderItemRecord[];
  records?: PurchaseOrderRecord[];
  _count?: { items: number; grns: number; revisions: number };
}

export interface PurchaseOrderListParams {
  page?: number;
  limit?: number;
  status?: ApiPurchaseOrderStatus;
  supplierId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'createdAt' | 'poNumber' | 'orderDate' | 'totalAmount' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface PurchaseOrderPage {
  data: PurchaseOrder[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface PurchaseOrderRemainingItemsRecord {
  poId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  status: 'APPROVED' | 'PARTIALLY_RECEIVED';
  items: Array<{
    itemId: string;
    productId: string;
    productName: string;
    sku: string;
    unitOfMeasure: string;
    hasSerialNumber: boolean;
    orderedQty: number;
    receivedQty: number;
    remainingQty: number;
    unitPrice: string | number;
    notes?: string | null;
  }>;
}

export interface PurchaseOrderItemPayload {
  productId: string;
  qty: number;
  unitPrice: number;
  discountType?: DiscountType;
  /** Percentage value for PERCENTAGE; monetary value for FIXED_AMOUNT. */
  discountAmount?: number;
  notes?: string;
}

export interface CreatePurchaseOrderPayload {
  supplierId: string;
  orderDate?: string;
  expectedDeliveryDate?: string | null;
  paymentTerms?: string;
  deliveryInstructions?: string;
  note?: string;
  totalDiscountType?: DiscountType;
  totalDiscount?: number;
  items: PurchaseOrderItemPayload[];
  submitForApproval?: boolean;
}

export type UpdatePurchaseOrderPayload = Partial<Omit<CreatePurchaseOrderPayload, 'submitForApproval'>>;

export interface PurchaseOrderActionPayload {
  remark?: string;
  rejectionReason?: string;
}

export interface PurchaseOrderDeleteResponse {
  success: boolean;
  message: string;
}

export function mapPurchaseOrder(record: PurchaseOrderApiRecord): PurchaseOrder {
  const items = (record.items ?? []).map((item) => {
    const gross = Number(item.unitPrice) * item.qty;
    const discountAmount = Number(item.discountAmount ?? 0);
    const discountValue = item.discountValue === undefined
      ? item.discountType === 'PERCENTAGE' && gross > 0
        ? discountAmount * 100 / gross
        : discountAmount
      : Number(item.discountValue);
    return {
      id: item.id,
      productId: item.productId,
      productCode: item.product?.sku ?? '',
      productName: item.product?.name ?? '',
      quantity: item.qty,
      unitPrice: Number(item.unitPrice),
      discountPercent: item.discountType === 'PERCENTAGE' ? discountValue : 0,
      discountAmount,
      discountType: item.discountType,
      discountValue,
      taxRate: 0,
      taxAmount: 0,
      total: Number(item.totalPrice),
      receivedQuantity: item.receivedQty,
      notes: item.notes ?? undefined,
    };
  });

  const discountValue = record.totalDiscountValue === undefined
    ? record.totalDiscountType === 'PERCENTAGE' && Number(record.subtotal) > 0
      ? Number(record.totalDiscount) * 100 / Number(record.subtotal)
      : Number(record.totalDiscount)
    : Number(record.totalDiscountValue);
  const approverName = record.approver?.fullName || record.approver?.email;
  const verifierName = record.verifier?.fullName || record.verifier?.email;
  return {
    id: record.id,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    poNumber: record.poNumber,
    supplierId: record.supplierId,
    supplierName: record.supplier?.name ?? '',
    supplierCode: record.supplier?.supplierCode ?? '',
    supplierContactPerson: record.supplier?.contactPerson ?? undefined,
    supplierEmail: record.supplier?.email ?? undefined,
    supplierPhone: record.supplier?.phone ?? undefined,
    supplierAddress: record.supplier?.address ?? undefined,
    supplierVatNumber: record.supplier?.vatNumber ?? record.supplier?.taxNumber ?? undefined,
    orderDate: record.orderDate,
    expectedDeliveryDate: record.expectedDeliveryDate ?? '',
    paymentTerms: record.paymentTerms ?? '',
    currency: 'LKR',
    status: record.status as PurchaseOrderStatus,
    items,
    itemCount: record._count?.items ?? items.length,
    subtotal: Number(record.subtotal),
    totalDiscount: Number(record.totalDiscount),
    taxTotal: 0,
    shippingCharges: 0,
    otherCharges: 0,
    grandTotal: Number(record.totalAmount),
    notes: record.note ?? undefined,
    deliveryInstructions: record.deliveryInstructions ?? undefined,
    createdBy: record.createdById,
    createdByName: record.creator?.fullName || record.creator?.email || '',
    createdByRole: record.createdByRole as PurchaseOrder['createdByRole'],
    purchasingManagerApproval: record.verifyBy
      ? {
          approvedById: record.verifyBy,
          approvedByName: verifierName || '',
          approvedAt: record.verifyAt ?? record.updatedAt,
          remarks: record.verifyRemarks ?? undefined,
        }
      : undefined,
    approvedBy: record.approvedBy ?? undefined,
    approvedByName: approverName,
    approvedAt: record.approvedAt ?? undefined,
    rejectionReason: record.rejectionReason ?? undefined,
    sentAt: record.issueAt ?? undefined,
  };
}
