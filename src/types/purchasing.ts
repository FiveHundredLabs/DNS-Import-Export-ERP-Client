import { BaseEntity } from './common';

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'SENT_TO_SUPPLIER'
  | 'PARTIALLY_RECEIVED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxRate: number; // e.g. 18 for 18% VAT
  taxAmount: number;
  total: number;
  receivedQuantity?: number;
  notes?: string;
}

export interface PurchaseOrder extends BaseEntity {
  poNumber: string;
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  supplierContactPerson?: string;
  supplierEmail?: string;
  supplierPhone?: string;
  supplierAddress?: string;
  supplierVatNumber?: string;
  orderDate: string;
  expectedDeliveryDate: string;
  paymentTerms: string;
  currency: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  subtotal: number;
  totalDiscount: number;
  taxTotal: number;
  shippingCharges: number;
  otherCharges: number;
  grandTotal: number;
  notes?: string;
  deliveryInstructions?: string;
  createdBy: string;
  createdByName: string;
  approvalRequestId?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  sentAt?: string;
}

export interface CreatePurchaseOrderDTO {
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  supplierContactPerson?: string;
  supplierEmail?: string;
  supplierPhone?: string;
  supplierAddress?: string;
  supplierVatNumber?: string;
  orderDate: string;
  expectedDeliveryDate: string;
  paymentTerms: string;
  currency?: string;
  items: Array<{
    productId: string;
    productCode: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
    taxRate?: number;
    notes?: string;
  }>;
  shippingCharges?: number;
  otherCharges?: number;
  notes?: string;
  deliveryInstructions?: string;
  submitForApproval?: boolean;
}

export interface PurchaseOrderFilter {
  status?: PurchaseOrderStatus | 'ALL';
  supplierId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
}

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs.' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
];

