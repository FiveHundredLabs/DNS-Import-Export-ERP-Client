export type DeliveryNoteStatus =
  | 'DRAFT'
  | 'PREPARED'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'REJECTION_PENDING_APPROVAL'
  | 'REJECTION_APPROVED'
  | 'REJECTION_DECLINED';

export type RejectionReasonCode =
  | 'DAMAGED_IN_TRANSIT'
  | 'DEFECTIVE_PRODUCT'
  | 'WRONG_SPECIFICATION'
  | 'PACKAGING_DAMAGED'
  | 'CUSTOMER_REFUSED'
  | 'OTHER';

export interface DeliveryNoteItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  uom: string;
  invoicedQuantity: number;
  dispatchedQuantity: number;
  unitBarcodes: string[]; // Scanned Code-128 unit barcodes allocated to this delivery
  acceptedQuantity: number;
  rejectedQuantity: number;
  rejectedUnitBarcodes: string[]; // Scanned barcodes of units returned/rejected by customer
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
  totalInvoicedUnits: number;
  totalDispatchedUnits: number;
  totalAcceptedUnits: number;
  totalRejectedUnits: number;
  // Stock Keeper rejection submission
  rejectionSubmittedBy?: string;
  rejectionSubmittedAt?: string;
  rejectionNotes?: string;
  // Supervisor / Manager Approval
  rejectionApprovedBy?: string;
  rejectionApprovedAt?: string;
  rejectionApprovalRemarks?: string;
  // Customer sign-off
  customerSignatureName?: string;
  customerSignedAt?: string;
  receivedInGoodCondition?: boolean;
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
    reason: RejectionReasonCode | string;
    notes?: string;
  }[];
  notes?: string;
  submittedBy: string;
}
