export type SupplierPaymentType = 'ADVANCE' | 'BILL_PAYMENT';
export type SupplierPaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CHEQUE';
export type SupplierPaymentStatus =
  | 'RECORDED'
  | 'PARTIALLY_UTILIZED'
  | 'FULLY_UTILIZED'
  | 'CANCELLED';

export interface CreateSupplierPaymentPayload {
  supplierId: string;
  purchaseOrderId?: string;
  paymentType?: SupplierPaymentType;
  isAdvance?: boolean;
  amount: number;
  paymentMethod?: SupplierPaymentMethod;
  reference?: string;
  paymentDate?: string;
  notes?: string;
}

export interface SupplierPaymentItem {
  id: string;
  paymentNumber: string;
  supplierId: string;
  supplier?: {
    id: string;
    supplierCode?: string;
    name: string;
  };
  purchaseOrderId?: string | null;
  purchaseOrder?: {
    id: string;
    poNumber: string;
  } | null;
  paymentType: SupplierPaymentType;
  isAdvance: boolean;
  amount: string | number;
  utilizedAmount: string | number;
  remainingAmount: string | number;
  paymentMethod: SupplierPaymentMethod;
  reference?: string | null;
  paymentDate: string;
  notes?: string | null;
  status: SupplierPaymentStatus;
  journalEntryId?: string | null;
  journal?: {
    id: string;
    entryNumber: string;
    status: string;
  };
  grnAllocations?: Array<{
    id: string;
    costingId: string;
    allocatedAmount: string | number;
    costing?: {
      id: string;
      grnId: string;
      grn?: {
        id: string;
        grnNumber: string;
        status: string;
        receivedDate: string;
      };
    };
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface AvailableAdvanceItem {
  id: string;
  paymentNumber: string;
  paymentDate: string;
  amount: string | number;
  utilizedAmount: string | number;
  remainingAmount: string | number;
  reference?: string | null;
  purchaseOrder?: {
    id: string;
    poNumber: string;
  } | null;
}

export interface SupplierPaymentQueryParams {
  supplierId?: string;
  purchaseOrderId?: string;
  paymentType?: SupplierPaymentType;
  isAdvance?: boolean;
  status?: SupplierPaymentStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedSupplierPaymentsResponse {
  data: SupplierPaymentItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
