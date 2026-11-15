export type DeliveryNoteStatus =
  | 'DRAFT'
  | 'PREPARED'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'REJECTION_PENDING_APPROVAL'
  | 'REJECTION_APPROVED'
  | 'REJECTION_DECLINED'
  | 'PARTIALLY_REJECTED'
  | 'REJECTED'
  | 'CANCELLATION_PENDING'
  | 'CANCELLED';

export type RejectionReasonCode =
  | 'DAMAGED'
  | 'CUSTOMER_REFUSED'
  | 'DAMAGED_IN_TRANSIT'
  | 'DEFECTIVE_PRODUCT'
  | 'WRONG_SPECIFICATION'
  | 'PACKAGING_DAMAGED'
  | 'OTHER';

export interface RejectedUnitDetail {
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  serialNumber?: string;
  reason: RejectionReasonCode | string;
  condition?: 'REUSABLE' | 'DAMAGED';
  notes?: string;
}

export interface ReturnedUnitDetail {
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  condition: 'REUSABLE' | 'DAMAGED';
  reason?: RejectionReasonCode | string;
  notes?: string;
}

export interface DeliveryNoteRejectionApprovalRequest {
  id: string;
  deliveryNoteId: string;
  deliveryNoteNumber: string;
  customerId: string;
  customerName: string;
  submittedBy: string;
  submittedById?: string;
  submittedAt: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED';
  totalUnits: number;
  totalDeliveredUnits?: number;
  totalDamagedUnits?: number;
  totalReusableUnits?: number;
  items: {
    productId: string;
    productName: string;
    sku: string;
    rejectedBarcodes: string[];
    damagedBarcodes?: string[];
    reusableBarcodes?: string[];
    reason: RejectionReasonCode | string;
    notes?: string;
  }[];
  returnedUnitsDetail?: ReturnedUnitDetail[];
  reviewedBy?: string;
  reviewedById?: string;
  reviewedAt?: string;
  remarks?: string;
}

export interface DeliveryNoteItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  uom: string;
  invoicedQuantity?: number;
  dispatchedQuantity: number;
  unitBarcodes: string[]; // Scanned Code-128 unit barcodes allocated to this delivery
  acceptedQuantity: number;
  rejectedQuantity: number;
  damagedQuantity?: number;
  reusableQuantity?: number;
  rejectedUnitBarcodes: string[]; // Scanned barcodes of units returned/rejected by customer
  damagedUnitBarcodes?: string[];
  reusableUnitBarcodes?: string[];
  rejectionReason?: RejectionReasonCode | string;
  rejectionNotes?: string;
}

export interface DeliveryNote {
  id: string;
  deliveryNoteNumber: string; // e.g. DN-2026-0001
  invoiceId?: string;
  invoiceNumber?: string;
  orderId?: string;
  orderNumber?: string;
  customerId: string;
  customerName: string;
  customerCode: string;
  customerAddress?: string;
  customerPhone?: string;
  customerVatNumber?: string;
  driverName: string;
  driverPhone?: string;
  vehicleNumber: string;
  dispatchDate: string; // YYYY-MM-DD
  deliveryRoute?: string;
  notes?: string;
  status: DeliveryNoteStatus;
  items: DeliveryNoteItem[];
  totalInvoicedUnits?: number;
  totalDispatchedUnits: number;
  totalAcceptedUnits: number;
  totalRejectedUnits: number;
  totalDamagedUnits?: number;
  totalReusableUnits?: number;

  // Stock Keeper rejection submission
  rejectionSubmittedBy?: string;
  rejectionSubmittedAt?: string;
  rejectionNotes?: string;

  // Supervisor / Manager Approval
  rejectionApprovedBy?: string;
  rejectionApprovedAt?: string;
  rejectionApprovalRemarks?: string;
  rejectionApprovalRequest?: DeliveryNoteRejectionApprovalRequest;
  rejectedUnitsDetail?: RejectedUnitDetail[];
  returnedUnitsDetail?: ReturnedUnitDetail[];

  // Cancellation governance
  cancellationRequestedBy?: string;
  cancellationRequestedAt?: string;
  cancellationReason?: string;
  cancellationApprovedBy?: string;
  cancellationApprovedAt?: string;
  cancellationApprovalRemarks?: string;

  // Customer sign-off
  customerSignatureName?: string;
  customerSignedAt?: string;
  receivedInGoodCondition?: boolean;
  isLocked?: boolean; // Permanently true once created (non-editable record)
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeliveryNotePayload {
  invoiceId?: string;
  orderId?: string;
  orderNumber?: string;
  customerId?: string;
  customerName?: string;
  customerCode?: string;
  customerAddress?: string;
  customerPhone?: string;
  customerVatNumber?: string;
  driverName: string;
  driverPhone?: string;
  vehicleNumber: string;
  dispatchDate: string;
  deliveryRoute?: string;
  notes?: string;
  items: {
    productId: string;
    productName: string;
    sku: string;
    uom: string;
    invoicedQuantity?: number;
    unitBarcodes: string[];
  }[];
  createdBy: string;
}

export interface SubmitRejectionPayload {
  deliveryNoteId: string;
  rejectedItems: {
    productId: string;
    rejectedBarcodes: string[];
    damagedBarcodes?: string[];
    reusableBarcodes?: string[];
    reason: RejectionReasonCode | string;
    notes?: string;
  }[];
  returnedUnitsDetail?: ReturnedUnitDetail[];
  notes?: string;
  submittedBy: string;
}

export interface SubmitDeliveryOutcomePayload {
  deliveryNoteId: string;
  deliveredUnitIds: string[];
  returnedUnits: ReturnedUnitDetail[];
  productSummary: {
    productId: string;
    dispatchedQuantity: number;
    deliveredQuantity: number;
    returnedQuantity: number;
    damagedQuantity: number;
    reusableQuantity: number;
  }[];
  notes?: string;
  submittedBy: string;
}
